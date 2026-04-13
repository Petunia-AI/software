"""
LinkedIn OAuth Integration.

Flow:
1. GET  /linkedin/connect    → Redirige al usuario a LinkedIn Login
2. GET  /linkedin/callback   → LinkedIn redirige aquí con ?code=...
3. GET  /linkedin/status     → Estado de la conexión
4. POST /linkedin/disconnect → Desconecta LinkedIn
5. POST /linkedin/post       → Publica contenido en LinkedIn
6. GET  /linkedin/comments   → Lista comentarios de un post
7. POST /linkedin/reply      → Responde a un comentario

Permisos solicitados:
  - openid, profile, email
  - w_member_social     (publicar en perfil personal)
  - r_organization_social, w_organization_social (publicar en página de empresa)
  - rw_organization_admin (administrar páginas)
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
from app.services.linkedin_service import linkedin_service
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import secrets
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/linkedin", tags=["linkedin-oauth"])

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"

SCOPES = [
    "openid",
    "profile",
    "email",
    "w_member_social",
    "r_organization_social",
    "w_organization_social",
    "rw_organization_admin",
]

# CSRF state store en memoria (igual que meta_oauth)
_oauth_states: dict[str, str] = {}


def _require_linkedin_config():
    if not settings.linkedin_client_id or not settings.linkedin_client_secret:
        raise HTTPException(
            status_code=500,
            detail="LinkedIn Client ID / Secret no configurados. Contacta al administrador.",
        )


def _get_redirect_uri() -> str:
    return settings.linkedin_oauth_redirect_uri or f"{settings.frontend_url}/linkedin/callback"


# ── Connect ───────────────────────────────────────────────────────────────────

@router.get("/connect")
async def linkedin_connect(
    current_user: User = Depends(get_current_user),
):
    """Genera la URL de autorización de LinkedIn y redirige al usuario."""
    _require_linkedin_config()
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = current_user.business_id

    params = {
        "response_type": "code",
        "client_id": settings.linkedin_client_id,
        "redirect_uri": _get_redirect_uri(),
        "state": state,
        "scope": " ".join(SCOPES),
    }
    url = LINKEDIN_AUTH_URL + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": url, "state": state}


# ── Callback ──────────────────────────────────────────────────────────────────

@router.get("/callback")
async def linkedin_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """LinkedIn redirige aquí con el código de autorización."""
    frontend = settings.frontend_url.rstrip("/")
    _require_linkedin_config()

    if error or not code or not state:
        reason = error_description or error or "cancelled"
        logger.warning("linkedin_oauth_cancelled", reason=reason)
        return RedirectResponse(f"{frontend}/settings?linkedin=error&reason={reason}")

    business_id = _oauth_states.pop(state, None)
    if not business_id:
        logger.warning("linkedin_oauth_invalid_state")
        return RedirectResponse(f"{frontend}/settings?linkedin=error&reason=invalid_state")

    try:
        token_data = await linkedin_service.exchange_code(
            code=code,
            redirect_uri=_get_redirect_uri(),
            client_id=settings.linkedin_client_id,
            client_secret=settings.linkedin_client_secret,
        )
    except Exception as e:
        logger.error("linkedin_token_exchange_failed", error=str(e))
        return RedirectResponse(f"{frontend}/settings?linkedin=error&reason=token_exchange_failed")

    access_token = token_data.get("access_token", "")
    refresh_token = token_data.get("refresh_token", "")
    expires_in = token_data.get("expires_in", 5184000)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Obtener perfil
    profile = await linkedin_service.get_profile(access_token)
    person_urn = f"urn:li:person:{profile.get('sub', '')}" if profile.get("sub") else ""
    person_name = profile.get("name", "")

    # Obtener organizaciones
    orgs = await linkedin_service.get_organizations(access_token)
    org_urn = f"urn:li:organization:{orgs[0]['id']}" if orgs else ""

    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        return RedirectResponse(f"{frontend}/settings?linkedin=error&reason=business_not_found")

    business.linkedin_enabled = True
    business.linkedin_access_token = access_token
    business.linkedin_refresh_token = refresh_token or None
    business.linkedin_token_expires_at = expires_at
    business.linkedin_person_urn = person_urn
    business.linkedin_org_id = org_urn
    business.linkedin_name = person_name

    await db.commit()
    logger.info("linkedin_connected", business_id=business_id, person_urn=person_urn)
    return RedirectResponse(f"{frontend}/settings?linkedin=success")


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/status")
async def linkedin_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")
    return {
        "connected": business.linkedin_enabled,
        "name": business.linkedin_name,
        "person_urn": business.linkedin_person_urn,
        "org_id": business.linkedin_org_id,
        "token_expires_at": business.linkedin_token_expires_at.isoformat() if business.linkedin_token_expires_at else None,
    }


# ── Disconnect ────────────────────────────────────────────────────────────────

@router.post("/disconnect")
async def linkedin_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    business.linkedin_enabled = False
    business.linkedin_access_token = None
    business.linkedin_refresh_token = None
    business.linkedin_token_expires_at = None
    business.linkedin_person_urn = None
    business.linkedin_org_id = None
    business.linkedin_name = None
    await db.commit()
    return {"ok": True}


# ── Publicar post ─────────────────────────────────────────────────────────────

class LinkedInPostRequest(BaseModel):
    text: str
    image_url: str | None = None
    use_org: bool = False  # True = publicar como organización, False = como persona


@router.post("/post")
async def linkedin_post(
    body: LinkedInPostRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.linkedin_enabled or not business.linkedin_access_token:
        raise HTTPException(400, "LinkedIn no conectado")

    author_urn = (
        business.linkedin_org_id
        if body.use_org and business.linkedin_org_id
        else business.linkedin_person_urn
    )
    if not author_urn:
        raise HTTPException(400, "No hay URN de autor disponible")

    result_post = await linkedin_service.create_post(
        access_token=business.linkedin_access_token,
        author_urn=author_urn,
        text=body.text,
        image_url=body.image_url,
    )
    return result_post


# ── Comentarios ───────────────────────────────────────────────────────────────

@router.get("/comments")
async def linkedin_get_comments(
    post_urn: str = Query(..., description="URN del post, ej: urn:li:ugcPost:123456"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.linkedin_enabled or not business.linkedin_access_token:
        raise HTTPException(400, "LinkedIn no conectado")

    comments = await linkedin_service.get_post_comments(
        access_token=business.linkedin_access_token,
        post_urn=post_urn,
    )
    return {"comments": comments}


class LinkedInReplyRequest(BaseModel):
    post_urn: str
    comment_urn: str | None = None  # None = comentario nuevo al post
    text: str
    use_org: bool = False


@router.post("/reply")
async def linkedin_reply(
    body: LinkedInReplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.linkedin_enabled or not business.linkedin_access_token:
        raise HTTPException(400, "LinkedIn no conectado")

    author_urn = (
        business.linkedin_org_id
        if body.use_org and business.linkedin_org_id
        else business.linkedin_person_urn
    )
    if not author_urn:
        raise HTTPException(400, "No hay URN de autor disponible")

    if body.comment_urn:
        ok = await linkedin_service.reply_to_comment(
            access_token=business.linkedin_access_token,
            post_urn=body.post_urn,
            parent_comment_urn=body.comment_urn,
            author_urn=author_urn,
            text=body.text,
        )
    else:
        ok = await linkedin_service.post_comment(
            access_token=business.linkedin_access_token,
            post_urn=body.post_urn,
            author_urn=author_urn,
            text=body.text,
        )
    return {"ok": ok}
