"""
Video Generator Service — Genera videos para redes sociales con xAI Grok.

Usa el modelo grok-imagine-video (text-to-video) de la API de xAI.
La generación es asíncrona: primero se lanza el job y se devuelve un request_id,
luego se consulta el estado con get_video_status().

Configuración requerida en .env:
    XAI_API_KEY=tu_api_key  (obtener en https://console.x.ai/)

Docs: https://docs.x.ai/developers/rest-api-reference/inference/videos
"""
import httpx
import structlog
from app.config import settings

logger = structlog.get_logger()

XAI_API_BASE = "https://api.x.ai"
XAI_VIDEO_MODEL = "grok-imagine-video"

# Orientación del video según formato
# xAI acepta "landscape" (16:9) o "portrait" (9:16)
FORMAT_ORIENTATION: dict[str, str] = {
    "post":  "landscape",   # 16:9 — feed posts
    "story": "portrait",    # 9:16 — Stories
    "reel":  "portrait",    # 9:16 — Reels/TikTok
}

# Duración en segundos según formato
FORMAT_DURATION: dict[str, int] = {
    "post":  15,
    "story": 15,
    "reel":  15,
}

QUALITY_SUFFIX = (
    "cinematic quality, professional social media video, "
    "smooth motion, vivid colors, modern commercial aesthetic, no watermarks, "
    "no subtitles, no text overlay, no captions, no voice, no narration, no audio, silent video"
)


async def generate_social_video(
    video_prompt: str,
    format_type: str = "post",
    channel: str = "instagram",
    business_name: str = "",
) -> dict:
    """
    Lanza la generación de un video con grok-imagine-video (operación asíncrona).

    Args:
        video_prompt:  Descripción del video (generada por Claude)
        format_type:   "post" | "story" | "reel"
        channel:       "instagram" | "facebook" | "tiktok" | "linkedin"
        business_name: Nombre del negocio (para contextualizar el prompt)

    Returns:
        {
          "request_id":  str | None,   ← ID para consultar estado
          "status":      "processing" | "error",
          "message":     str,
          "error":       str | None
        }
    """
    if not settings.xai_api_key:
        logger.warning("video_generation_skipped", reason="XAI_API_KEY no configurado")
        return {
            "request_id": None,
            "status": "error",
            "message": "XAI_API_KEY no configurado",
            "error": "XAI_API_KEY no configurado — agrega tu key en Railway > Variables",
        }

    orientation = FORMAT_ORIENTATION.get(format_type, "landscape")
    duration = FORMAT_DURATION.get(format_type, 6)
    brand_context = f"for {business_name}" if business_name else "for a business"

    enhanced_prompt = (
        f"Professional social media {format_type} video {brand_context}. "
        f"{video_prompt}. "
        f"{QUALITY_SUFFIX}."
    )

    payload: dict = {
        "model": XAI_VIDEO_MODEL,
        "prompt": enhanced_prompt,
        "duration": duration,
    }
    # xAI acepta orientation solo si el modelo lo soporta; lo incluimos igual
    if orientation == "portrait":
        payload["orientation"] = "portrait"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{XAI_API_BASE}/v1/videos/generations",
                headers={
                    "Authorization": f"Bearer {settings.xai_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            data = response.json()

            if response.status_code in (200, 202):
                request_id = data.get("request_id")
                logger.info(
                    "video_generation_started",
                    request_id=request_id,
                    format=format_type,
                    channel=channel,
                )
                return {
                    "request_id": request_id,
                    "status": "processing",
                    "message": "Video en proceso — consulta el estado en unos minutos",
                    "error": None,
                }
            else:
                error_msg = (
                    data.get("error", {}).get("message")
                    or data.get("message")
                    or f"HTTP {response.status_code}"
                )
                logger.error(
                    "video_generation_failed",
                    status=response.status_code,
                    error=error_msg,
                )
                return {
                    "request_id": None,
                    "status": "error",
                    "message": f"Error al generar video: {error_msg}",
                    "error": error_msg,
                }

    except httpx.TimeoutException:
        logger.error("video_generation_timeout")
        return {
            "request_id": None,
            "status": "error",
            "message": "Timeout al crear el video",
            "error": "Timeout",
        }
    except Exception as e:
        logger.error("video_generation_error", error=str(e))
        return {
            "request_id": None,
            "status": "error",
            "message": str(e),
            "error": str(e),
        }


async def get_video_status(request_id: str) -> dict:
    """
    Consulta el estado de un video en proceso.

    Estados posibles: "pending" | "done" | "failed"

    Returns:
        {
          "status":    "processing" | "completed" | "failed" | "error",
          "video_url": str | None,
          "progress":  int,          ← 0-100
          "duration":  int | None,   ← segundos
          "error":     str | None
        }
    """
    if not settings.xai_api_key:
        return {"status": "error", "video_url": None, "progress": 0, "error": "XAI_API_KEY no configurado"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{XAI_API_BASE}/v1/videos/{request_id}",
                headers={
                    "Authorization": f"Bearer {settings.xai_api_key}",
                },
            )

            if response.status_code == 200:
                data = response.json()
                raw_status = data.get("status", "pending")
                progress = data.get("progress", 0)
                video_data = data.get("video") or {}

                if raw_status == "done":
                    video_url = video_data.get("url")
                    logger.info("video_generation_completed", request_id=request_id, url=video_url)
                    return {
                        "status": "completed",
                        "video_url": video_url,
                        "progress": 100,
                        "duration": video_data.get("duration"),
                        "error": None,
                    }
                elif raw_status == "failed":
                    error = data.get("error") or "Video generation failed"
                    logger.error("video_generation_failed_poll", request_id=request_id, error=error)
                    return {
                        "status": "failed",
                        "video_url": None,
                        "progress": 0,
                        "duration": None,
                        "error": str(error),
                    }
                else:
                    # still pending
                    return {
                        "status": "processing",
                        "video_url": None,
                        "progress": progress,
                        "duration": None,
                        "error": None,
                    }
            else:
                data = response.json()
                error = data.get("message") or f"HTTP {response.status_code}"
                return {"status": "error", "video_url": None, "progress": 0, "error": error}

    except httpx.TimeoutException:
        return {"status": "error", "video_url": None, "progress": 0, "error": "Timeout"}
    except Exception as e:
        logger.error("video_status_error", request_id=request_id, error=str(e))
        return {"status": "error", "video_url": None, "progress": 0, "error": str(e)}
