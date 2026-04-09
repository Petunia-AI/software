"""
Meta OAuth Integration — Facebook Login for Business.

Flow:
1. GET  /meta/connect      → Redirige al usuario a Facebook Login
2. GET  /meta/callback     → Facebook redirige aquí con ?code=...
3. POST /meta/select-page  → El cliente elige qué Page/IG/WA usar
4. POST /meta/disconnect   → Desconecta Meta
5. GET  /meta/status       → Estado de la conexión
6. POST /meta/refresh-token → Renueva el long-lived token (antes de que expire)

Permisos solicitados:
  - pages_show_list, pages_messaging, pages_read_engagement
  - instagram_basic, instagram_manage_messages
  - whatsapp_business_management, whatsapp_business_messaging
  - business_management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.business import Business
from app.api.auth import get_current_user
from app.models.user import User
from app.config import settings
from datetime import datetime, timezone, timedelta
import httpx
import structlog
import secrets

logger = structlog.get_logger()

router = APIRouter(prefix="/meta", tags=["meta-oauth"])

META_GRAPH_URL = "https://graph.facebook.com/v19.0"
META_OAUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth"

SCOPES = [
    "pages_show_list",
    "pages_messaging",
    "pages_read_engagement",
    "instagram_basic",
    "instagram_manage_messages",
    "whatsapp_business_management",
    "whatsapp_business_messaging",
    "business_management",
]

# In-memory CSRF state store (per-process). For production at scale, use Redis.
_oauth_states: dict[str, str] = {}


def _require_meta_config():
    if not settings.meta_app_id or not settings.meta_app_secret:
        raise HTTPException(
            status_code=500,
            detail="Meta App ID / Secret no configurados. Contacta al administrador.",
        )


@router.get("/connect")
async def meta_connect(
    current_user: User = Depends(get_current_user),
):
    """
    Genera la URL de Facebook Login y redirige al usuario.
    El frontend abre esta URL en una nueva ventana o popup.
    """
    _require_meta_config()

    state = secrets.token_urlsafe(32)
    _oauth_states[state] = current_user.business_id

    redirect_uri = settings.meta_oauth_redirect_uri
    if not redirect_uri:
        redirect_uri = f"{settings.frontend_url}/meta/callback"

    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": ",".join(SCOPES),
        "response_type": "code",
        "config_id": "",  # Optional: Facebook Login Configuration ID
    }
    # Remove empty params
    params = {k: v for k, v in params.items() if v}

    url = f"{META_OAUTH_URL}?" + "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": url, "state": state}


@router.get("/callback")
async def meta_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Facebook redirige aquí después de que el usuario autoriza.
    Intercambia el code por un token, obtiene pages/IG/WA y guarda todo.
    Siempre redirige al frontend al terminar (success o error).
    """
    frontend = settings.frontend_url.rstrip("/")
    _require_meta_config()

    # El usuario canceló
    if error or not code or not state:
        reason = error_description or error or "cancelled"
        logger.warning("meta_oauth_cancelled", reason=reason)
        return RedirectResponse(f"{frontend}/settings?meta=error&reason={reason}")

    # Validate CSRF state
    business_id = _oauth_states.pop(state, None)
    if not business_id:
        logger.warning("meta_oauth_invalid_state", state=state[:20])
        return RedirectResponse(f"{frontend}/settings?meta=error&reason=invalid_state")

    redirect_uri = settings.meta_oauth_redirect_uri
    if not redirect_uri:
        redirect_uri = f"{settings.frontend_url}/meta/callback"

    async with httpx.AsyncClient(timeout=20) as client:
        # Step 1: Exchange code for short-lived token
        token_resp = await client.get(
            f"{META_GRAPH_URL}/oauth/access_token",
            params={
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "redirect_uri": redirect_uri,
                "code": code,
            },
        )
        if token_resp.status_code != 200:
            logger.error("meta_oauth_token_exchange_failed", body=token_resp.text)
            raise HTTPException(400, f"Error al intercambiar código: {token_resp.json().get('error', {}).get('message', 'Unknown')}")

        token_data = token_resp.json()
        short_token = token_data["access_token"]

        # Step 2: Exchange for long-lived token (60 days)
        ll_resp = await client.get(
            f"{META_GRAPH_URL}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "fb_exchange_token": short_token,
            },
        )
        if ll_resp.status_code != 200:
            logger.error("meta_oauth_long_lived_failed", body=ll_resp.text)
            raise HTTPException(400, "Error al obtener token de larga duración")

        ll_data = ll_resp.json()
        long_lived_token = ll_data["access_token"]
        expires_in = ll_data.get("expires_in", 5184000)  # default 60 days
        token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Step 3: Get user info
        me_resp = await client.get(
            f"{META_GRAPH_URL}/me",
            params={"fields": "id,name", "access_token": long_lived_token},
        )
        me_data = me_resp.json() if me_resp.status_code == 200 else {}

        # Step 4: Get user's Pages with page-level tokens
        pages_resp = await client.get(
            f"{META_GRAPH_URL}/me/accounts",
            params={
                "fields": "id,name,access_token,instagram_business_account",
                "limit": "100",
                "access_token": long_lived_token,
            },
        )
        raw_pages = pages_resp.json().get("data", []) if pages_resp.status_code == 200 else []

        pages = []
        for p in raw_pages:
            ig = p.get("instagram_business_account", {})
            pages.append({
                "id": p["id"],
                "name": p.get("name", ""),
                "access_token": p.get("access_token", ""),
                "ig_id": ig.get("id", ""),
            })

        # Step 5: Get WhatsApp Business Account ID (if available)
        wa_business_id = ""
        biz_resp = await client.get(
            f"{META_GRAPH_URL}/me/businesses",
            params={
                "fields": "id,name,owned_whatsapp_business_accounts{id,name}",
                "access_token": long_lived_token,
            },
        )
        if biz_resp.status_code == 200:
            businesses = biz_resp.json().get("data", [])
            for biz in businesses:
                wa_accounts = biz.get("owned_whatsapp_business_accounts", {}).get("data", [])
                if wa_accounts:
                    wa_business_id = wa_accounts[0]["id"]
                    break

        # Step 6: Get WhatsApp phone numbers if we have a WABA
        wa_phones = []
        if wa_business_id:
            phones_resp = await client.get(
                f"{META_GRAPH_URL}/{wa_business_id}/phone_numbers",
                params={
                    "fields": "id,display_phone_number,verified_name,quality_rating",
                    "access_token": long_lived_token,
                },
            )
            if phones_resp.status_code == 200:
                wa_phones = phones_resp.json().get("data", [])

    # Save to business
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    business.meta_connected = True
    business.meta_user_id = me_data.get("id", "")
    business.meta_user_name = me_data.get("name", "")
    business.meta_long_lived_token = long_lived_token
    business.meta_token_expires_at = token_expires_at
    business.meta_pages = pages
    business.meta_wa_business_id = wa_business_id

    # Auto-select first page if only one
    if len(pages) == 1 and not business.meta_selected_page_id:
        page = pages[0]
        business.meta_selected_page_id = page["id"]
        business.instagram_page_id = page["id"]
        business.meta_page_token = page["access_token"]
        if page["ig_id"]:
            business.instagram_account_id = page["ig_id"]
            business.instagram_enabled = True
        business.messenger_enabled = True
        # Subscribe webhooks for auto-selected page
        await _subscribe_page_webhooks(page["id"], page["access_token"])

    # Auto-select first WA phone if only one
    if len(wa_phones) == 1 and not business.meta_selected_wa_phone_id:
        phone = wa_phones[0]
        business.meta_selected_wa_phone_id = phone["id"]
        business.meta_phone_number_id = phone["id"]
        business.meta_wa_token = long_lived_token
        business.whatsapp_phone = phone.get("display_phone_number", "")
        business.whatsapp_enabled = True

    await db.commit()

    logger.info(
        "meta_oauth_connected",
        business_id=business_id,
        user=me_data.get("name"),
        pages=len(pages),
        wa_business=wa_business_id,
    )

    # Redirigir al frontend con resultado
    return RedirectResponse(
        f"{frontend}/settings?meta=connected&pages={len(pages)}&wa_phones={len(wa_phones)}"
    )


@router.post("/select-page")
async def meta_select_page(
    page_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    El usuario elige qué Page usar para Messenger + Instagram DMs.
    Configura automáticamente los tokens y IDs necesarios.
    """
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.meta_connected:
        raise HTTPException(400, "Meta no está conectado")

    pages = business.meta_pages or []
    page = next((p for p in pages if p["id"] == page_id), None)
    if not page:
        raise HTTPException(404, "Página no encontrada en tu cuenta de Meta")

    business.meta_selected_page_id = page_id
    business.instagram_page_id = page_id
    business.meta_page_token = page["access_token"]

    if page.get("ig_id"):
        business.instagram_account_id = page["ig_id"]
        business.instagram_enabled = True
    else:
        business.instagram_account_id = None
        business.instagram_enabled = False

    business.messenger_enabled = True

    await db.commit()

    # Subscribe page to webhooks
    await _subscribe_page_webhooks(page_id, page["access_token"])

    return {
        "ok": True,
        "page_id": page_id,
        "page_name": page["name"],
        "instagram_id": page.get("ig_id", ""),
        "messenger_enabled": True,
        "instagram_enabled": bool(page.get("ig_id")),
    }


@router.post("/select-whatsapp")
async def meta_select_whatsapp(
    phone_number_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    El usuario elige qué número de WhatsApp usar.
    """
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.meta_connected:
        raise HTTPException(400, "Meta no está conectado")

    # Verify the phone exists
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{META_GRAPH_URL}/{phone_number_id}",
            params={
                "fields": "id,display_phone_number,verified_name",
                "access_token": business.meta_long_lived_token,
            },
        )
        if r.status_code != 200:
            raise HTTPException(404, "Número de WhatsApp no encontrado")
        phone_data = r.json()

    business.meta_selected_wa_phone_id = phone_number_id
    business.meta_phone_number_id = phone_number_id
    business.meta_wa_token = business.meta_long_lived_token
    business.whatsapp_phone = phone_data.get("display_phone_number", "")
    business.whatsapp_enabled = True

    await db.commit()

    # Subscribe WABA to webhooks
    if business.meta_wa_business_id:
        await _subscribe_waba_webhooks(business.meta_wa_business_id, business.meta_long_lived_token)

    return {
        "ok": True,
        "phone_number_id": phone_number_id,
        "display_phone": phone_data.get("display_phone_number", ""),
        "verified_name": phone_data.get("verified_name", ""),
    }


@router.get("/status")
async def meta_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Estado de la conexión con Meta."""
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    if not business.meta_connected:
        return {"connected": False}

    pages = business.meta_pages or []
    pages_out = [
        {
            "id": p["id"],
            "name": p["name"],
            "ig_id": p.get("ig_id", ""),
            "has_instagram": bool(p.get("ig_id")),
        }
        for p in pages
    ]

    # Get WA phones if connected
    wa_phones = []
    if business.meta_wa_business_id and business.meta_long_lived_token:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    f"{META_GRAPH_URL}/{business.meta_wa_business_id}/phone_numbers",
                    params={
                        "fields": "id,display_phone_number,verified_name,quality_rating",
                        "access_token": business.meta_long_lived_token,
                    },
                )
                if r.status_code == 200:
                    wa_phones = r.json().get("data", [])
        except Exception:
            pass

    return {
        "connected": True,
        "user_name": business.meta_user_name,
        "pages": pages_out,
        "selected_page_id": business.meta_selected_page_id,
        "selected_wa_phone_id": business.meta_selected_wa_phone_id,
        "wa_business_id": business.meta_wa_business_id,
        "wa_phones": wa_phones,
        "token_expires_at": business.meta_token_expires_at.isoformat() if business.meta_token_expires_at else None,
    }


@router.post("/disconnect")
async def meta_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Desconecta la integración con Meta."""
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    business.meta_connected = False
    business.meta_user_id = None
    business.meta_user_name = None
    business.meta_long_lived_token = None
    business.meta_token_expires_at = None
    business.meta_pages = []
    business.meta_wa_business_id = None
    business.meta_selected_page_id = None
    business.meta_selected_wa_phone_id = None

    # Don't reset channel-specific fields — keep manual config as fallback
    await db.commit()

    logger.info("meta_oauth_disconnected", business_id=current_user.business_id)
    return {"ok": True}


@router.post("/refresh-token")
async def meta_refresh_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Renueva el long-lived token antes de que expire.
    Los long-lived tokens de Meta duran ~60 días y pueden renovarse.
    """
    _require_meta_config()

    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.meta_long_lived_token:
        raise HTTPException(400, "No hay token de Meta para renovar")

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{META_GRAPH_URL}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "fb_exchange_token": business.meta_long_lived_token,
            },
        )
        if r.status_code != 200:
            logger.error("meta_token_refresh_failed", body=r.text)
            raise HTTPException(400, "No se pudo renovar el token. Reconecta con Meta.")

        data = r.json()
        business.meta_long_lived_token = data["access_token"]
        expires_in = data.get("expires_in", 5184000)
        business.meta_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # Update page tokens and WA token with the refreshed user token
        # Page tokens derived from long-lived user tokens don't expire
        # but the WA token needs the latest user token
        if business.meta_wa_token and business.meta_selected_wa_phone_id:
            business.meta_wa_token = data["access_token"]

    await db.commit()

    return {
        "ok": True,
        "expires_at": business.meta_token_expires_at.isoformat(),
    }


@router.post("/test/{channel}")
async def test_channel(
    channel: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Prueba un canal conectado. channel: 'wa' | 'instagram' | 'messenger'
    """
    from fastapi.responses import JSONResponse
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404)

    if channel == "wa":
        if not b.meta_wa_token or not b.meta_phone_number_id:
            raise HTTPException(400, "WhatsApp no configurado (falta Phone Number ID o token)")
        if not b.whatsapp_phone:
            raise HTTPException(400, "Configura tu número de WhatsApp primero")
        phone = b.whatsapp_phone.replace("+", "").replace(" ", "").replace("-", "")
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{META_GRAPH_URL}/{b.meta_phone_number_id}/messages",
                headers={"Authorization": f"Bearer {b.meta_wa_token}"},
                json={
                    "messaging_product": "whatsapp",
                    "to": phone,
                    "type": "text",
                    "text": {"body": "✅ ¡Conexión exitosa! Tu agente de ventas IA está listo."},
                },
            )
        if r.status_code in (200, 201):
            return {"ok": True, "message": f"Mensaje de prueba enviado a {b.whatsapp_phone}"}
        err = r.json().get("error", {}).get("message", "Error desconocido")
        return JSONResponse(status_code=400, content={"detail": f"Meta API: {err}"})

    elif channel == "instagram":
        if not b.meta_page_token or not b.instagram_account_id:
            raise HTTPException(400, "Instagram no configurado — conecta tu cuenta de Meta primero")
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{META_GRAPH_URL}/{b.instagram_account_id}",
                params={"fields": "id,name,username,followers_count", "access_token": b.meta_page_token},
            )
        if r.status_code == 200:
            data = r.json()
            handle = data.get("username", data.get("name", "?"))
            followers = data.get("followers_count", 0)
            return {"ok": True, "message": f"✓ @{handle} · {followers:,} seguidores"}
        return JSONResponse(status_code=400, content={"detail": "Token de Instagram inválido — reconecta tu cuenta de Meta"})

    elif channel == "messenger":
        if not b.meta_page_token or not b.instagram_page_id:
            raise HTTPException(400, "Messenger no configurado — conecta tu cuenta de Meta primero")
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{META_GRAPH_URL}/{b.instagram_page_id}",
                params={"fields": "id,name,fan_count", "access_token": b.meta_page_token},
            )
        if r.status_code == 200:
            data = r.json()
            followers = data.get("fan_count", 0)
            return {"ok": True, "message": f"✓ Página '{data.get('name', '?')}' · {followers:,} seguidores"}
        return JSONResponse(status_code=400, content={"detail": "Token de Messenger inválido — reconecta tu cuenta de Meta"})

    raise HTTPException(400, "Canal inválido. Usa: wa, instagram, messenger")


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _subscribe_page_webhooks(page_id: str, page_access_token: str) -> bool:
    """
    Suscribe una Facebook Page a webhooks de messages y messaging_postbacks.
    Esto activa Messenger + Instagram DMs automáticamente.
    """
    url = f"{META_GRAPH_URL}/{page_id}/subscribed_apps"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                url,
                params={"access_token": page_access_token},
                json={
                    "subscribed_fields": [
                        "messages",
                        "messaging_postbacks",
                        "messaging_optins",
                    ],
                },
            )
            if r.status_code == 200:
                logger.info("meta_page_webhook_subscribed", page_id=page_id)
                return True
            else:
                logger.error("meta_page_webhook_failed", page_id=page_id, body=r.text)
                return False
    except Exception as e:
        logger.error("meta_page_webhook_exception", error=str(e))
        return False


async def _subscribe_waba_webhooks(waba_id: str, access_token: str) -> bool:
    """
    Suscribe un WhatsApp Business Account a webhooks de messages.
    """
    url = f"{META_GRAPH_URL}/{waba_id}/subscribed_apps"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                url,
                params={"access_token": access_token},
            )
            if r.status_code == 200:
                logger.info("meta_waba_webhook_subscribed", waba_id=waba_id)
                return True
            else:
                logger.error("meta_waba_webhook_failed", waba_id=waba_id, body=r.text)
                return False
    except Exception as e:
        logger.error("meta_waba_webhook_exception", error=str(e))
        return False
