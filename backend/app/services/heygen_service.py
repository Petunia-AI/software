"""
HeyGen Service — Integración con HeyGen para crear videos con avatares IA.

Solo disponible en el plan Premium (enterprise).
Los videos se generan de forma asíncrona: primero se crea el trabajo
y luego se consulta su estado hasta que esté listo.

Configuración requerida en .env:
    HEYGEN_API_KEY=tu_api_key  (obtener en https://app.heygen.com/settings?nav=API)

Docs: https://docs.heygen.com/reference/create-an-avatar-video-v2
"""
import httpx
import structlog
from app.config import settings

logger = structlog.get_logger()

HEYGEN_API_BASE = "https://api.heygen.com"

# Avatar y voz por defecto (en español)
# Puedes listar tus avatares en: GET /v2/avatars
# Puedes listar tus voces en:    GET /v2/voices
DEFAULT_AVATAR_ID = "Abigail_expressive_2024112501"
DEFAULT_VOICE_ID  = "0e5e270741404038804a4f27747f59b9"  # "leonardo soto" — voz en español latam (masculina)

# Dimensiones según formato
DIMENSIONS: dict[str, dict] = {
    "post":    {"width": 1280, "height": 720},    # landscape 16:9
    "story":   {"width": 720,  "height": 1280},   # portrait  9:16
    "reel":    {"width": 720,  "height": 1280},   # portrait  9:16
}


async def create_video(
    script: str,
    avatar_id: str | None = None,
    voice_id:  str | None = None,
    format_type: str = "post",
    test_mode: bool = True,
) -> dict:
    """
    Inicia la generación de un video con avatar IA en HeyGen.

    Args:
        script:      Texto que leerá el avatar (máx 1500 chars)
        avatar_id:   ID del avatar (usa default si no se especifica)
        voice_id:    ID de la voz (usa default si no se especifica)
        format_type: "post" | "story" | "reel" (determina orientación)
        test_mode:   True = modo prueba (sin cobro, aplica marca de agua)

    Returns:
        { "video_id": str, "status": "processing"|"error", "message": str }
    """
    if not settings.heygen_api_key:
        logger.warning("heygen_skipped", reason="HEYGEN_API_KEY no configurado")
        return {
            "video_id": None,
            "status": "error",
            "error": "HEYGEN_API_KEY no configurado — agrega tu key en /admin/settings",
        }

    dims = DIMENSIONS.get(format_type, DIMENSIONS["post"])

    payload = {
        "video_inputs": [
            {
                "character": {
                    "type": "avatar",
                    "avatar_id": avatar_id or DEFAULT_AVATAR_ID,
                    "avatar_style": "normal",
                },
                "voice": {
                    "type": "text",
                    "input_text": script[:1500],  # límite HeyGen
                    "voice_id": voice_id or DEFAULT_VOICE_ID,
                    "speed": 1.0,
                },
                "background": {
                    "type": "color",
                    "value": "#FFFFFF",
                },
            }
        ],
        "dimension": {
            "width": dims["width"],
            "height": dims["height"],
        },
        "test": test_mode,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{HEYGEN_API_BASE}/v2/video/generate",
                headers={
                    "X-Api-Key": settings.heygen_api_key,
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            data = response.json()

            if response.status_code == 200 and not data.get("error"):
                video_id = data.get("data", {}).get("video_id")
                logger.info("heygen_video_created", video_id=video_id, format=format_type)
                return {
                    "video_id": video_id,
                    "status": "processing",
                    "message": "Video en proceso — tardará entre 5-10 minutos",
                }
            else:
                error = data.get("error") or data.get("message") or f"HTTP {response.status_code}"
                logger.error("heygen_create_failed", error=error, status=response.status_code)
                return {
                    "video_id": None,
                    "status": "error",
                    "error": str(error),
                }

    except httpx.TimeoutException:
        logger.error("heygen_timeout")
        return {"video_id": None, "status": "error", "error": "Timeout al crear video"}
    except Exception as e:
        logger.error("heygen_error", error=str(e))
        return {"video_id": None, "status": "error", "error": str(e)}


async def get_video_status(video_id: str) -> dict:
    """
    Consulta el estado de un video en HeyGen.

    Estados posibles: processing | completed | failed

    Returns:
        {
          "status":        "processing"|"completed"|"failed"|"error",
          "video_url":     str | None,
          "thumbnail_url": str | None,
          "error":         str | None
        }
    """
    if not settings.heygen_api_key:
        return {"status": "error", "error": "HEYGEN_API_KEY no configurado"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{HEYGEN_API_BASE}/v1/video_status.get",
                headers={"X-Api-Key": settings.heygen_api_key},
                params={"video_id": video_id},
            )

            data = response.json()
            video_data = data.get("data", {})
            status = video_data.get("status", "processing")
            video_url = video_data.get("video_url")

            if status == "completed":
                logger.info("heygen_video_ready", video_id=video_id)

            return {
                "status": status,
                "video_url": video_url,
                "thumbnail_url": video_data.get("thumbnail_url"),
                "error": video_data.get("error") if status == "failed" else None,
            }

    except Exception as e:
        logger.error("heygen_status_error", video_id=video_id, error=str(e))
        return {"status": "error", "error": str(e)}


async def list_avatars() -> list[dict]:
    """Lista los avatares disponibles en la cuenta HeyGen."""
    if not settings.heygen_api_key:
        return []
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{HEYGEN_API_BASE}/v2/avatars",
                headers={"X-Api-Key": settings.heygen_api_key},
            )
            data = response.json()
            return data.get("data", {}).get("avatars", [])
    except Exception as e:
        logger.error("heygen_list_avatars_error", error=str(e))
        return []
