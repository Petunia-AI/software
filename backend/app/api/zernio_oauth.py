"""
Zernio Social Media OAuth Integration.

Flow:
1. POST /zernio/connect/{platform}  → Crea perfil (si no existe) y devuelve URL OAuth por plataforma
2. GET  /zernio/status              → Estado + cuentas conectadas
3. POST /zernio/refresh             → Refresca la lista de cuentas desde Zernio
4. DELETE /zernio/account/{id}      → Desconecta una plataforma específica
5. POST /zernio/disconnect          → Elimina todo el perfil de Zernio
6. POST /zernio/post                → Publica contenido en redes sociales
7. PATCH /zernio/settings           → Configura auto-respondedor
8. POST /zernio/register-webhook    → Registra webhook de Petunia en Zernio
"""
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.business import Business
from app.api.auth import get_current_user
from app.models.user import User
from app.config import settings
from app.services.zernio_service import zernio_service, ZERNIO_PLATFORMS
from pydantic import BaseModel
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/zernio", tags=["zernio"])


def _require_config():
    if not settings.zernio_api_key:
        raise HTTPException(
            status_code=500,
            detail="ZERNIO_API_KEY no está configurado. Contacta al administrador.",
        )


async def _get_business(current_user: User, db: AsyncSession) -> Business:
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")
    return business


# Formato de Ayrshare: 8HEX-8HEX-8HEX-8HEX (ej. 312DE106-DFB34DE1-BF8358D6-4A7B9DD0)
_AYRSHARE_ID_RE = re.compile(r'^[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$', re.IGNORECASE)


def _is_ayrshare_id(profile_id: str) -> bool:
    """Devuelve True si el ID tiene el formato de Ayrshare (no es un ID válido de Zernio)."""
    return bool(_AYRSHARE_ID_RE.match(profile_id))


async def _reset_profile(business: Business, db: AsyncSession, reason: str) -> None:
    """Limpia el perfil de Zernio y guarda."""
    logger.warning(
        "zernio_stale_profile_reset",
        business_id=business.id,
        stale_id=(business.zernio_profile_id or "")[:12],
        reason=reason,
    )
    business.zernio_profile_id = None
    business.zernio_ref_id = None
    business.zernio_connected_platforms = []
    business.zernio_enabled = False
    await db.commit()


async def _ensure_profile(business: Business, db: AsyncSession) -> None:
    """
    Garantiza que el negocio tiene un perfil válido en Zernio.

    Detecta IDs migrados de Ayrshare por su formato (8-8-8-8 hex) y los descarta
    directamente sin llamar a la API, forzando la creación de un perfil nuevo.
    """
    if business.zernio_profile_id:
        # Descartar IDs de Ayrshare sin llamar a la API
        if _is_ayrshare_id(business.zernio_profile_id):
            await _reset_profile(business, db, reason="ayrshare_format_id")
        else:
            # Verificar que el perfil existe en Zernio
            try:
                await zernio_service.get_profile(business.zernio_profile_id)
                return  # Existe y es válido
            except Exception as e:
                await _reset_profile(business, db, reason=f"get_profile_failed: {e}")

    short_id = str(business.id)[:8]
    base_title = re.sub(r"\s+\[[\w-]+\]$", "", (business.name or "Negocio").strip())
    name = f"{base_title} [{short_id}]"
    try:
        profile_data = await zernio_service.create_profile(
            name=name,
            description=f"Perfil Petunia — business_id: {business.id}",
        )
        profile_id = profile_data.get("_id") or profile_data.get("id")
        if not profile_id:
            logger.error("zernio_no_profile_id", data=profile_data)
            raise HTTPException(500, "Zernio no devolvió un profileId")
        business.zernio_profile_id = profile_id
        business.zernio_ref_id = str(business.id)
        await db.commit()
        logger.info("zernio_profile_created", business_id=business.id, profile_id=profile_id[:8])
    except HTTPException:
        raise
    except Exception as e:
        logger.error("zernio_create_profile_failed", error=str(e))
        raise HTTPException(502, f"Error al crear perfil en Zernio: {str(e)}")


# ── Connect (por plataforma) ──────────────────────────────────────────────────

@router.post("/connect/{platform}")
async def zernio_connect(
    platform: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Crea (o reutiliza) el perfil Zernio del cliente y devuelve la URL
    de OAuth para que el usuario vincule la plataforma indicada.
    """
    _require_config()
    platform = platform.lower()
    if platform not in ZERNIO_PLATFORMS:
        raise HTTPException(400, f"Plataforma no soportada: {platform}. Disponibles: {list(ZERNIO_PLATFORMS.keys())}")

    business = await _get_business(current_user, db)
    await _ensure_profile(business, db)

    try:
        url = await zernio_service.get_connect_url(platform, business.zernio_profile_id)
    except Exception as e:
        err_str = str(e)
        # Si Zernio devuelve 400 para ese profileId, puede ser un ID stale no detectado —
        # resetear y crear perfil nuevo, luego reintentar una vez.
        if "400" in err_str and business.zernio_profile_id:
            logger.warning("zernio_connect_400_retry", platform=platform, stale_id=business.zernio_profile_id[:12])
            await _reset_profile(business, db, reason="connect_returned_400")
            await _ensure_profile(business, db)
            try:
                url = await zernio_service.get_connect_url(platform, business.zernio_profile_id)
            except Exception as e2:
                logger.error("zernio_connect_url_failed_retry", platform=platform, error=str(e2))
                raise HTTPException(502, f"Error al obtener URL de conexión para {platform}: {str(e2)}")
        else:
            logger.error("zernio_connect_url_failed", platform=platform, error=err_str)
            raise HTTPException(502, f"Error al obtener URL de conexión para {platform}: {err_str}")

    return {"url": url, "platform": platform, "profile_id": business.zernio_profile_id}


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/status")
async def zernio_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    business = await _get_business(current_user, db)

    # Auto-refrescar si hay perfil pero sin cuentas cacheadas
    if business.zernio_profile_id and settings.zernio_api_key and not business.zernio_connected_platforms:
        try:
            accounts = await zernio_service.get_connected_platforms(business.zernio_profile_id)
            if accounts:
                business.zernio_connected_platforms = accounts
                business.zernio_enabled = True
                await db.commit()
                logger.info("zernio_status_auto_refreshed", business_id=business.id, count=len(accounts))
        except Exception as e:
            logger.warning("zernio_status_auto_refresh_failed", error=str(e))

    # Normalize legacy string-list format → list[dict] with platform+accountId
    raw_platforms = business.zernio_connected_platforms or []
    connected_platforms: list[dict] = [
        a if isinstance(a, dict) else {"platform": a, "accountId": ""}
        for a in raw_platforms
    ]
    return {
        "connected": bool(business.zernio_profile_id),
        "enabled": business.zernio_enabled,
        "profile_id": business.zernio_profile_id,
        "connected_platforms": connected_platforms,
        "autoresponder_enabled": bool(business.zernio_autoresponder_enabled),
        "autoresponder_channels": business.zernio_autoresponder_channels or [],
        "available_platforms": ZERNIO_PLATFORMS,
    }


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post("/refresh")
async def zernio_refresh(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Consulta Zernio y actualiza la lista de cuentas vinculadas."""
    _require_config()
    business = await _get_business(current_user, db)
    if not business.zernio_profile_id:
        raise HTTPException(400, "No hay perfil de Zernio configurado")

    accounts = await zernio_service.get_connected_platforms(business.zernio_profile_id)
    business.zernio_connected_platforms = accounts
    business.zernio_enabled = len(accounts) > 0
    await db.commit()

    logger.info("zernio_refreshed", business_id=business.id, count=len(accounts))
    return {"connected_platforms": accounts, "enabled": business.zernio_enabled}


# ── Disconnect account (una plataforma) ──────────────────────────────────────

@router.delete("/account/{account_id}")
async def zernio_disconnect_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Desconecta una plataforma específica por su accountId."""
    _require_config()
    business = await _get_business(current_user, db)

    try:
        await zernio_service.disconnect_account(account_id)
    except Exception as e:
        logger.warning("zernio_disconnect_account_failed", account_id=account_id, error=str(e))

    # Actualizar lista cacheada
    if business.zernio_profile_id:
        accounts = await zernio_service.get_connected_platforms(business.zernio_profile_id)
        business.zernio_connected_platforms = accounts
        business.zernio_enabled = len(accounts) > 0
        await db.commit()

    logger.info("zernio_account_disconnected", business_id=business.id, account_id=account_id)
    return {"ok": True, "connected_platforms": business.zernio_connected_platforms or []}


# ── Disconnect all (elimina perfil completo) ──────────────────────────────────

@router.post("/disconnect")
async def zernio_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Elimina el perfil de Zernio y limpia todos los campos del negocio."""
    business = await _get_business(current_user, db)

    if business.zernio_profile_id and settings.zernio_api_key:
        try:
            await zernio_service.delete_profile(business.zernio_profile_id)
        except Exception as e:
            logger.warning("zernio_delete_profile_failed", error=str(e))

    business.zernio_profile_id = None
    business.zernio_ref_id = None
    business.zernio_connected_platforms = []
    business.zernio_enabled = False
    await db.commit()

    logger.info("zernio_disconnected", business_id=business.id)
    return {"ok": True}


# ── Settings (auto-respondedor) ───────────────────────────────────────────────

class ZernioSettingsRequest(BaseModel):
    autoresponder_enabled: bool
    autoresponder_channels: list[str] | None = None


@router.patch("/settings")
async def zernio_update_settings(
    body: ZernioSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Activa o desactiva el auto-respondedor y configura los canales habilitados."""
    business = await _get_business(current_user, db)
    business.zernio_autoresponder_enabled = body.autoresponder_enabled
    if body.autoresponder_channels is not None:
        business.zernio_autoresponder_channels = body.autoresponder_channels
    await db.commit()
    logger.info(
        "zernio_autoresponder_toggled",
        business_id=business.id,
        enabled=body.autoresponder_enabled,
        channels=body.autoresponder_channels,
    )
    return {
        "ok": True,
        "autoresponder_enabled": body.autoresponder_enabled,
        "autoresponder_channels": business.zernio_autoresponder_channels or [],
    }


# ── Post (publicar contenido) ─────────────────────────────────────────────────

class ZernioPostRequest(BaseModel):
    text: str
    platforms: list[str]           # ["instagram", "facebook", ...]
    media_urls: list[str] | None = None
    scheduled_date: str | None = None   # ISO 8601
    publish_now: bool = False


@router.post("/post")
async def zernio_post(
    body: ZernioPostRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Publica contenido en las redes sociales conectadas del cliente."""
    _require_config()
    business = await _get_business(current_user, db)
    if not business.zernio_profile_id:
        raise HTTPException(400, "No hay perfil de Zernio configurado")

    # Mapear plataformas solicitadas a sus accountIds
    connected: list[dict] = business.zernio_connected_platforms or []
    platform_accounts = [
        {"platform": a["platform"], "accountId": a["accountId"]}
        for a in connected
        if a["platform"] in body.platforms
    ]
    if not platform_accounts:
        raise HTTPException(400, "Ninguna de las plataformas solicitadas está conectada")

    try:
        result = await zernio_service.post(
            profile_id=business.zernio_profile_id,
            text=body.text,
            platform_accounts=platform_accounts,
            media_urls=body.media_urls,
            scheduled_date=body.scheduled_date,
            publish_now=body.publish_now,
        )
    except Exception as e:
        logger.error("zernio_post_endpoint_failed", error=str(e))
        raise HTTPException(502, f"Error al publicar: {str(e)}")

    return {"ok": True, "result": result}


# ── Register webhook ──────────────────────────────────────────────────────────

@router.post("/register-webhook")
async def zernio_register_webhook(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Registra la URL de webhook de Petunia en Zernio."""
    _require_config()
    business = await _get_business(current_user, db)
    if not business.zernio_profile_id:
        raise HTTPException(400, "No hay perfil de Zernio configurado")

    base_url = settings.app_base_url.rstrip("/") if hasattr(settings, "app_base_url") and settings.app_base_url else ""
    if not base_url:
        raise HTTPException(500, "APP_BASE_URL no está configurado")

    webhook_url = f"{base_url}/api/webhooks/zernio"
    try:
        result = await zernio_service.register_webhook(webhook_url)
    except Exception as e:
        logger.error("zernio_register_webhook_failed", error=str(e))
        raise HTTPException(502, f"Error al registrar webhook: {str(e)}")

    logger.info("zernio_webhook_registered", business_id=business.id, url=webhook_url)
    return {"ok": True, "webhook_url": webhook_url, "result": result}
