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


# Helper

async def _create_ayrshare_profile(business, db: AsyncSession) -> None:
    """Crea un perfil en Ayrshare y guarda el profileKey en la BD.
    Usa un título único con sufijo del business_id para evitar duplicados."""
    import re
    short_id = str(business.id)[:8]
    base_title = (business.name or "Negocio").strip()
    # Quitar el sufijo anterior si existe
    base_title = re.sub(r"\s+\[[\w-]+\]$", "", base_title)
    title = f"{base_title} [{short_id}]"
    try:
        profile_data = await ayrshare_service.create_profile(
            ref_id=str(business.id),
            title=title,
        )
        profile_key = (
            profile_data.get("profileKey")
            or profile_data.get("profile", {}).get("profileKey")
        )
        if not profile_key:
            logger.error("ayrshare_no_profile_key", data=profile_data)
            raise HTTPException(500, "Ayrshare no devolvio un profileKey")
        business.ayrshare_profile_key = profile_key
        business.ayrshare_ref_id = str(business.id)  # placeholder; se sobreescribe en refresh
        await db.commit()
        # Leer el refId real que Ayrshare asigna al perfil (usado en webhooks)
        try:
            created_profile = await ayrshare_service.get_profile(profile_key)
            real_ref_id = created_profile.get("refId")
            if real_ref_id:
                business.ayrshare_ref_id = real_ref_id
                await db.commit()
        except Exception:
            pass  # El placeholder es suficiente por ahora; refresh lo actualizará
        logger.info("ayrshare_profile_created", business_id=business.id, profile_key=profile_key[:8])
    except HTTPException:
        raise
    except Exception as e:
        logger.error("ayrshare_create_profile_failed", error=str(e))
        raise HTTPException(502, f"Error al crear perfil en Ayrshare: {str(e)}")


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
        await _create_ayrshare_profile(business, db)

    # Verificar que el profileKey guardado es válido; si no, recrear el perfil
    if business.ayrshare_profile_key:
        try:
            await ayrshare_service.get_profile(business.ayrshare_profile_key)
        except Exception:
            logger.warning("ayrshare_invalid_profile_key_detected", business_id=business.id)
            business.ayrshare_profile_key = None
            business.ayrshare_ref_id = None
            business.ayrshare_connected_platforms = []
            business.ayrshare_enabled = False
            await db.commit()
            await _create_ayrshare_profile(business, db)

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
        "autoresponder_channels": business.ayrshare_autoresponder_channels or [],
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

    # Sincronizar el refId real que Ayrshare usa en sus webhooks
    try:
        profile = await ayrshare_service.get_profile(business.ayrshare_profile_key)
        ayrshare_ref_id = profile.get("refId")
        if ayrshare_ref_id:
            business.ayrshare_ref_id = ayrshare_ref_id
            logger.info("ayrshare_ref_id_synced", business_id=business.id, ref_id=ayrshare_ref_id)
    except Exception as e:
        logger.warning("ayrshare_ref_id_sync_failed", error=str(e))

    await db.commit()

    logger.info("ayrshare_refreshed", business_id=business.id, platforms=platforms)
    return {"connected_platforms": platforms, "enabled": business.ayrshare_enabled, "ref_id_synced": business.ayrshare_ref_id}


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


# Force-set profile key (repair endpoint)

class AyrshareRepairRequest(BaseModel):
    profile_key: str

@router.post("/repair")
async def ayrshare_repair(
    body: AyrshareRepairRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fuerza la actualización del profileKey en BD con uno conocido válido."""
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")
    business.ayrshare_profile_key = body.profile_key
    business.ayrshare_connected_platforms = []
    business.ayrshare_enabled = False
    await db.commit()
    # Refrescar plataformas inmediatamente
    platforms = await ayrshare_service.get_connected_platforms(body.profile_key)
    if platforms:
        business.ayrshare_connected_platforms = platforms
        business.ayrshare_enabled = True
        await db.commit()
    logger.info("ayrshare_repaired", business_id=business.id, profile_key=body.profile_key[:8], platforms=platforms)
    return {"ok": True, "profile_key": body.profile_key[:8] + "...", "connected_platforms": platforms}


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
        # También intentar sin profile key (perfil principal)
        primary = await ayrshare_service.get_profile(None)
        # Generar JWT URL para ver qué URL se produce
        jwt_url = None
        jwt_error = None
        try:
            jwt_url = await ayrshare_service.generate_jwt_url(business.ayrshare_profile_key)
        except Exception as e:
            jwt_error = str(e)
        return {
            "sub_profile_key": business.ayrshare_profile_key[:8] + "...",
            "db_ayrshare_ref_id": business.ayrshare_ref_id,
            "db_autoresponder_enabled": business.ayrshare_autoresponder_enabled,
            "db_autoresponder_channels": business.ayrshare_autoresponder_channels,
            "jwt_url_generated": jwt_url,
            "jwt_error": jwt_error,
            "sub_profile": {
                "activeSocialAccounts": profile.get("activeSocialAccounts"),
                "messagingEnabled": profile.get("messagingEnabled"),
                "messagingConversationMonthlyCount": profile.get("messagingConversationMonthlyCount"),
                "refId": profile.get("refId"),
                "title": profile.get("title"),
                "displayNames_count": len(profile.get("displayNames", [])),
                "displayNames_platforms": [e.get("platform") for e in profile.get("displayNames", [])],
                "raw_keys": list(profile.keys()),
            },
            "primary_profile": {
                "activeSocialAccounts": primary.get("activeSocialAccounts"),
                "messagingEnabled": primary.get("messagingEnabled"),
                "refId": primary.get("refId"),
                "raw_keys": list(primary.keys()),
            },
        }
    except Exception as e:
        raise HTTPException(502, f"Error al consultar Ayrshare: {str(e)}")


# Debug comments

@router.get("/debug-comments")
async def ayrshare_debug_comments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Testea el polling de comentarios para diagnóstico."""
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business or not business.ayrshare_profile_key:
        raise HTTPException(400, "No hay perfil de Ayrshare configurado")

    platforms = business.ayrshare_connected_platforms or []
    # Only comment-supported platforms
    comment_platforms = [p for p in platforms if p in ("facebook", "instagram")]
    if not comment_platforms:
        return {"status_code": 0, "platforms_queried": platforms, "error": "No comment-supported platforms connected (need facebook or instagram)"}

    result = await ayrshare_service.get_recent_comments(
        profile_key=business.ayrshare_profile_key,
        platforms=comment_platforms,
        last_n=5,
    )

    # Also show raw post history for debugging
    raw_posts = {}
    for platform in comment_platforms:
        posts = await ayrshare_service.get_history_for_platform(
            profile_key=business.ayrshare_profile_key,
            platform=platform,
            limit=5,
        )
        raw_posts[platform] = [
            {"id": p.get("id"), "commentsCount": p.get("commentsCount"), "created": p.get("created"), "post": (p.get("post") or "")[:60]}
            for p in posts
        ]

    return {
        "platforms_queried": comment_platforms,
        "comments_found": len(result),
        "comments": result[:10],
        "raw_posts": raw_posts,
    }


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

    # Usar siempre la URL pública de producción para que Ayrshare pueda acceder
    PUBLIC_URL = "https://gentes-de-ventas-production.up.railway.app"
    base = PUBLIC_URL.rstrip("/")
    webhook_url = f"{base}/api/webhooks/ayrshare"

    # Obtener el negocio del usuario para registrar también en el sub-perfil
    biz_result = await db.execute(
        select(Business).where(Business.id == current_user.business_id).limit(1)
    )
    business = biz_result.scalar_one_or_none()
    profile_key = business.ayrshare_profile_key if business else None

    results = {}
    # Registrar en perfil primario para DMs y comentarios
    for action in ("messages", "comment"):
        try:
            results[f"primary_{action}"] = await ayrshare_service.register_webhook(webhook_url, action=action)
            logger.info("ayrshare_webhook_registered_primary", url=webhook_url, action=action)
        except Exception as e:
            logger.warning("ayrshare_webhook_primary_failed", error=str(e), action=action)
            results[f"primary_{action}_error"] = str(e)

    # Registrar también en el sub-perfil del negocio (si tiene)
    if profile_key:
        for action in ("messages", "comment"):
            try:
                results[f"sub_{action}"] = await ayrshare_service.register_webhook(webhook_url, profile_key=profile_key, action=action)
                logger.info("ayrshare_webhook_registered_sub", url=webhook_url, profile_key=profile_key[:8], action=action)
            except Exception as e:
                logger.warning("ayrshare_webhook_sub_failed", error=str(e), action=action)
                results[f"sub_{action}_error"] = str(e)

    return {"ok": True, "webhook_url": webhook_url, "results": results}


# Settings (autoresponder toggle)

class AyrshareSettingsRequest(BaseModel):
    autoresponder_enabled: bool
    autoresponder_channels: list[str] | None = None


@router.patch("/settings")
async def ayrshare_update_settings(
    body: AyrshareSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Activa o desactiva el auto-respondedor y configura los canales habilitados."""
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")

    business.ayrshare_autoresponder_enabled = body.autoresponder_enabled
    if body.autoresponder_channels is not None:
        business.ayrshare_autoresponder_channels = body.autoresponder_channels
    await db.commit()
    logger.info(
        "ayrshare_autoresponder_toggled",
        business_id=business.id,
        enabled=body.autoresponder_enabled,
        channels=body.autoresponder_channels,
    )
    return {
        "ok": True,
        "autoresponder_enabled": body.autoresponder_enabled,
        "autoresponder_channels": business.ayrshare_autoresponder_channels or [],
    }


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
