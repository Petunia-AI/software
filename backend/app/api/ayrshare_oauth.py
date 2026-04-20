"""
Ayrshare Auto Global OAuth Integration.

Flow:
1. POST /ayrshare/connect      -> Crea perfil en Ayrshare (si no existe) y devuelve JWT URL
2. GET  /ayrshare/status       -> Estado de conexion + redes vinculadas
3. POST /ayrshare/refresh      -> Refresca la lista de redes conectadas desde Ayrshare
4. POST /ayrshare/disconnect   -> Elimina el perfil de Ayrshare y limpia los campos
5. POST /ayrshare/post         -> Publica contenido en redes sociales del cliente
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.business import Business
from app.api.auth import get_current_user
from app.models.user import User
from app.config import settings
from app.services.ayrshare_service import ayrshare_service
from pydantic import BaseModel
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/ayrshare", tags=["ayrshare"])


def _require_config():
    if not settings.ayrshare_api_key:
        raise HTTPException(
            status_code=500,
            detail="AYRSHARE_API_KEY no esta configurado. Contacta al administrador.",
        )


# Connect

@router.post("/connect")
async def ayrshare_connect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Crea (o reutiliza) el perfil Ayrshare del cliente y devuelve
    la URL JWT para que vincule sus redes sociales.
    """
    _require_config()

    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    # Si no tiene profileKey, crear perfil en Ayrshare
    if not business.ayrshare_profile_key:
        try:
            profile_data = await ayrshare_service.create_profile(
                ref_id=business.id,
                title=business.name or business.id,
            )
            profile_key = (
                profile_data.get("profileKey")
                or profile_data.get("profile", {}).get("profileKey")
            )
            if not profile_key:
                logger.error("ayrshare_no_profile_key", data=profile_data)
                raise HTTPException(500, "Ayrshare no devolvio un profileKey")

            business.ayrshare_profile_key = profile_key
            business.ayrshare_ref_id = business.id
            await db.commit()
            logger.info("ayrshare_profile_created", business_id=business.id)
        except HTTPException:
            raise
        except Exception as e:
            logger.error("ayrshare_create_profile_failed", error=str(e))
            raise HTTPException(502, f"Error al crear perfil en Ayrshare: {str(e)}")

    # Llamar a Ayrshare para generar la JWT URL
    try:
        jwt_url = await ayrshare_service.generate_jwt_url(
            profile_key=business.ayrshare_profile_key,
        )
    except ValueError as e:
        raise HTTPException(500, str(e))
    except Exception as e:
        logger.error("ayrshare_jwt_failed", error=str(e))
        raise HTTPException(502, f"Error al generar JWT con Ayrshare: {str(e)}")

    return {"url": jwt_url, "profile_key": business.ayrshare_profile_key}


# Status

@router.get("/status")
async def ayrshare_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    # Si hay perfil pero las plataformas no están cacheadas, consultarlas en Ayrshare
    if business.ayrshare_profile_key and settings.ayrshare_api_key and not business.ayrshare_connected_platforms:
        try:
            platforms = await ayrshare_service.get_connected_platforms(business.ayrshare_profile_key)
            if platforms:
                business.ayrshare_connected_platforms = platforms
                business.ayrshare_enabled = True
                await db.commit()
                logger.info("ayrshare_status_auto_refreshed", business_id=business.id, platforms=platforms)
        except Exception as e:
            logger.warning("ayrshare_status_auto_refresh_failed", error=str(e))

    return {
        "connected": bool(business.ayrshare_profile_key),
        "enabled": business.ayrshare_enabled,
        "profile_key_set": bool(business.ayrshare_profile_key),
        "connected_platforms": business.ayrshare_connected_platforms or [],
        "autoresponder_enabled": bool(business.ayrshare_autoresponder_enabled),
    }


# Refresh platforms

@router.post("/refresh")
async def ayrshare_refresh(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Consulta Ayrshare y actualiza la lista de redes vinculadas."""
    _require_config()

    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.ayrshare_profile_key:
        raise HTTPException(400, "No hay perfil de Ayrshare configurado")

    platforms = await ayrshare_service.get_connected_platforms(business.ayrshare_profile_key)
    business.ayrshare_connected_platforms = platforms
    business.ayrshare_enabled = len(platforms) > 0
    await db.commit()

    logger.info("ayrshare_refreshed", business_id=business.id, platforms=platforms)
    return {"connected_platforms": platforms, "enabled": business.ayrshare_enabled}


# Disconnect

@router.post("/disconnect")
async def ayrshare_disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    if business.ayrshare_profile_key and settings.ayrshare_api_key:
        try:
            await ayrshare_service.delete_profile(business.ayrshare_profile_key)
        except Exception as e:
            logger.warning("ayrshare_delete_profile_failed", error=str(e))

    business.ayrshare_profile_key = None
    business.ayrshare_ref_id = None
    business.ayrshare_connected_platforms = []
    business.ayrshare_enabled = False
    await db.commit()

    logger.info("ayrshare_disconnected", business_id=business.id)
    return {"ok": True}


# Debug — raw Ayrshare profile response

@router.get("/debug-profile")
async def ayrshare_debug_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve la respuesta cruda de Ayrshare para diagnóstico."""
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.ayrshare_profile_key:
        raise HTTPException(400, "No hay perfil de Ayrshare configurado")

    try:
        profile = await ayrshare_service.get_profile(business.ayrshare_profile_key)
        return {
            "profile_key": business.ayrshare_profile_key[:8] + "...",
            "activeSocialAccounts": profile.get("activeSocialAccounts"),
            "displayNames_count": len(profile.get("displayNames", [])),
            "displayNames_platforms": [e.get("platform") for e in profile.get("displayNames", [])],
            "raw_keys": list(profile.keys()),
        }
    except Exception as e:
        raise HTTPException(502, f"Error al consultar Ayrshare: {str(e)}")


# Register webhook

@router.post("/register-webhook")
async def ayrshare_register_webhook(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Registra la URL del webhook de Petunia en Ayrshare para que envie
    notificaciones de comentarios/mensajes en tiempo real.
    La URL es: {BACKEND_URL}/api/webhooks/ayrshare
    """
    _require_config()

    webhook_url = f"{settings.backend_url.rstrip('/')}/api/webhooks/ayrshare"
    try:
        result = await ayrshare_service.register_webhook(webhook_url)
        logger.info("ayrshare_webhook_registered", url=webhook_url, result=result)
        return {"ok": True, "webhook_url": webhook_url, "ayrshare_response": result}
    except Exception as e:
        logger.error("ayrshare_register_webhook_failed", error=str(e))
        raise HTTPException(502, f"Error al registrar webhook: {str(e)}")


# Settings (autoresponder toggle)

class AyrshareSettingsRequest(BaseModel):
    autoresponder_enabled: bool


@router.patch("/settings")
async def ayrshare_update_settings(
    body: AyrshareSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Activa o desactiva el auto-respondedor de comentarios/mensajes."""
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    business.ayrshare_autoresponder_enabled = body.autoresponder_enabled
    await db.commit()
    logger.info(
        "ayrshare_autoresponder_toggled",
        business_id=business.id,
        enabled=body.autoresponder_enabled,
    )
    return {"ok": True, "autoresponder_enabled": body.autoresponder_enabled}


# Post

class AyrsharePostRequest(BaseModel):
    text: str
    platforms: list[str]
    media_urls: list[str] | None = None
    scheduled_date: str | None = None  # ISO 8601


@router.post("/post")
async def ayrshare_post(
    body: AyrsharePostRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_config()

    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.ayrshare_profile_key:
        raise HTTPException(400, "Ayrshare no esta conectado")

    try:
        post_result = await ayrshare_service.post(
            profile_key=business.ayrshare_profile_key,
            text=body.text,
            platforms=body.platforms,
            media_urls=body.media_urls,
            scheduled_date=body.scheduled_date,
        )
    except Exception as e:
        logger.error("ayrshare_post_failed", error=str(e))
        raise HTTPException(502, f"Error al publicar: {str(e)}")

    return post_result
