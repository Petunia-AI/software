"""
TikTok OAuth Integration.

Flow:
1. GET  /tiktok/connect      → Redirige al usuario a TikTok Login
2. GET  /tiktok/callback     → TikTok redirige aquí con ?code=...
3. GET  /tiktok/status       → Estado de la conexión
4. POST /tiktok/disconnect   → Desconecta TikTok
5. POST /tiktok/publish      → Publica un video desde URL pública
6. GET  /tiktok/videos       → Lista videos del usuario
7. GET  /tiktok/comments     → Lista comentarios de un video
8. POST /tiktok/reply        → Responde a un comentario

Permisos solicitados:
  - user.info.basic
  - video.publish
  - video.list
  - comment.list (Research API)
"""
import hashlib
import base64
import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.models.business import Business
from app.api.auth import get_current_user
from app.models.user import User
from app.config import settings
from app.services.tiktok_service import tiktok_service
from datetime import datetime, timezone, timedelta
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/tiktok", tags=["tiktok-oauth"])

TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"

SCOPES = [
    "user.info.basic",
    "video.publish",
    "video.list",
]

_oauth_states: dict[str, dict] = {}  # state → {business_id, code_verifier}


def _require_tiktok_config():
    if not settings.tiktok_client_key or not settings.tiktok_client_secret:
        raise HTTPException(
            status_code=500,
            detail="TikTok Client Key / Secret no configurados. Contacta al administrador.",
        )


def _get_redirect_uri() -> str:
    return settings.tiktok_oauth_redirect_uri or f"{settings.frontend_url}/tiktok/callback"


def _generate_pkce() -> tuple[str, str]:
    """Genera code_verifier y code_challenge para PKCE."""
    verifier = base64.urlsafe_b64encode(os.urandom(32)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


# ── Connect ───────────────────────────────────────────────────────────────────

@router.get("/connect")
async def tiktok_connect(
    current_user: User = Depends(get_current_user),
):
    """Genera la URL de autorización de TikTok con PKCE."""
    _require_tiktok_config()

    state = secrets.token_urlsafe(32)
    code_verifier, code_challenge = _generate_pkce()
    _oauth_states[state] = {
        "business_id": current_user.business_id,
        "code_verifier": code_verifier,
    }

    params = {
        "client_key": settings.tiktok_client_key,
        "scope": ",".join(SCOPES),
        "response_type": "code",
        "redirect_uri": _get_redirect_uri(),
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    url = TIKTOK_AUTH_URL + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": url, "state": state}


# ── Callback ──────────────────────────────────────────────────────────────────

@router.get("/callback")
async def tiktok_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    frontend = settings.frontend_url.rstrip("/")
    _require_tiktok_config()

    if error or not code or not state:
        reason = error_description or error or "cancelled"
        logger.warning("tiktok_oauth_cancelled", reason=reason)
        return RedirectResponse(f"{frontend}/settings?tiktok=error&reason={reason}")

    state_data = _oauth_states.pop(state, None)
    if not state_data:
        logger.warning("tiktok_oauth_invalid_state")
        return RedirectResponse(f"{frontend}/settings?tiktok=error&reason=invalid_state")

    business_id = state_data["business_id"]
    code_verifier = state_data["code_verifier"]

    try:
        token_data = await tiktok_service.exchange_code(
            code=code,
            redirect_uri=_get_redirect_uri(),
            client_key=settings.tiktok_client_key,
            client_secret=settings.tiktok_client_secret,
            code_verifier=code_verifier,
        )
    except Exception as e:
        logger.error("tiktok_token_exchange_failed", error=str(e))
        return RedirectResponse(f"{frontend}/settings?tiktok=error&reason=token_exchange_failed")

    access_token = token_data.get("access_token", "")
    refresh_token = token_data.get("refresh_token", "")
    expires_in = token_data.get("expires_in", 86400)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Obtener info del usuario
    user_info = await tiktok_service.get_user_info(access_token)
    open_id = user_info.get("open_id", "")
    username = user_info.get("display_name", "")

    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        return RedirectResponse(f"{frontend}/settings?tiktok=error&reason=business_not_found")

    business.tiktok_enabled = True
    business.tiktok_access_token = access_token
    business.tiktok_refresh_token = refresh_token or None
    business.tiktok_token_expires_at = expires_at
    business.tiktok_open_id = open_id
    business.tiktok_username = username

    await db.commit()
    logger.info("tiktok_connected", business_id=business_id, open_id=open_id)
    return RedirectResponse(f"{frontend}/settings?tiktok=success")


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/status")
async def tiktok_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")
    return {
        "connected": business.tiktok_enabled,
        "username": business.tiktok_username,
        "open_id": business.tiktok_open_id,
        "token_expires_at": business.tiktok_token_expires_at.isoformat() if business.tiktok_token_expires_at else None,
    }


# ── Disconnect ────────────────────────────────────────────────────────────────

@router.post("/disconnect")
async def tiktok_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    business.tiktok_enabled = False
    business.tiktok_access_token = None
    business.tiktok_refresh_token = None
    business.tiktok_token_expires_at = None
    business.tiktok_open_id = None
    business.tiktok_username = None
    await db.commit()
    return {"ok": True}


# ── Publicar video ────────────────────────────────────────────────────────────

class TikTokPublishRequest(BaseModel):
    video_url: str
    title: str = ""
    privacy: str = "PUBLIC_TO_EVERYONE"


@router.post("/publish")
async def tiktok_publish(
    body: TikTokPublishRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.tiktok_enabled or not business.tiktok_access_token:
        raise HTTPException(400, "TikTok no conectado")

    return await tiktok_service.publish_video_from_url(
        access_token=business.tiktok_access_token,
        video_url=body.video_url,
        title=body.title,
        privacy=body.privacy,
    )


# ── Videos ────────────────────────────────────────────────────────────────────

@router.get("/videos")
async def tiktok_videos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.tiktok_enabled or not business.tiktok_access_token:
        raise HTTPException(400, "TikTok no conectado")

    videos = await tiktok_service.list_videos(business.tiktok_access_token)
    return {"videos": videos}


# ── Comentarios ───────────────────────────────────────────────────────────────

@router.get("/comments")
async def tiktok_comments(
    video_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.tiktok_enabled or not business.tiktok_access_token:
        raise HTTPException(400, "TikTok no conectado")

    comments = await tiktok_service.list_comments(business.tiktok_access_token, video_id)
    return {"comments": comments}


class TikTokReplyRequest(BaseModel):
    video_id: str
    comment_id: str | None = None  # None = comentario nuevo
    text: str


@router.post("/reply")
async def tiktok_reply(
    body: TikTokReplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.tiktok_enabled or not business.tiktok_access_token:
        raise HTTPException(400, "TikTok no conectado")

    if body.comment_id:
        ok = await tiktok_service.reply_to_comment(
            access_token=business.tiktok_access_token,
            video_id=body.video_id,
            comment_id=body.comment_id,
            text=body.text,
        )
    else:
        ok = await tiktok_service.post_comment(
            access_token=business.tiktok_access_token,
            video_id=body.video_id,
            text=body.text,
        )
    return {"ok": ok}
