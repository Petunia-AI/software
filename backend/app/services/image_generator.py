"""
Image Generator Service — Genera imágenes profesionales para redes sociales.

Usa fal.ai con el modelo nano-banana-2 (Gemini 3.1 Flash Image) para generar
imágenes de alta calidad adaptadas a cada canal y formato (post, story, reel).

Configuración requerida en .env:
    FAL_API_KEY=tu_api_key  (obtener en https://fal.ai/dashboard/keys)
"""
import httpx
import random
import structlog
from app.config import settings

logger = structlog.get_logger()

# Modelo a usar
FAL_MODEL_ENDPOINT = "https://fal.run/fal-ai/nano-banana-2"

# ── Aspect ratio por formato y canal ────────────────────────────────────────
# nano-banana-2 usa aspect_ratio en vez de width/height absolutos
FORMAT_ASPECT_RATIO: dict[str, str] = {
    "post":            "1:1",    # cuadrado estándar
    "story":           "9:16",   # vertical Stories/Reels
    "reel":            "9:16",   # vertical Reels/TikTok
    "linkedin_banner": "16:9",   # landscape LinkedIn
}

CHANNEL_FORMAT_OVERRIDE: dict[str, str] = {
    "linkedin": "linkedin_banner",
}

# Dimensiones aproximadas para el frontend (según aspect ratio + resolución 2K)
APPROX_DIMENSIONS: dict[str, tuple[int, int]] = {
    "1:1":  (2048, 2048),
    "9:16": (1152, 2048),
    "16:9": (2048, 1152),
}

# Estilos de animación de entrada (se aplican en el frontend con CSS/Framer Motion)
ANIMATION_STYLES = ["fade-in", "slide-up", "zoom-in", "slide-left", "scale-in"]

# Sufijos de calidad para el prompt
QUALITY_SUFFIX = (
    "ultra-high quality, 2K resolution, professional commercial photography, "
    "perfect lighting, vivid colors, modern design aesthetic, "
    "visually striking composition, suitable for social media advertising"
)


async def generate_social_image(
    image_prompt: str,
    format_type: str = "post",
    channel: str = "instagram",
    business_name: str = "",
) -> dict:
    """
    Genera una imagen profesional para redes sociales usando fal.ai nano-banana-2
    (Gemini 3.1 Flash Image — text-to-image).

    Args:
        image_prompt:  Prompt descriptivo generado por Claude (en inglés)
        format_type:   "post" | "story" | "reel"
        channel:       "instagram" | "facebook" | "tiktok" | "linkedin"
        business_name: Nombre del negocio (para contextualizar el prompt)

    Returns:
        {
          "image_url":       str | None,
          "animation_style": str,
          "width":           int,
          "height":          int,
          "error":           str | None
        }
    """
    if not settings.fal_api_key:
        logger.warning("image_generation_skipped", reason="FAL_API_KEY no configurado")
        return {
            "image_url": None,
            "animation_style": random.choice(ANIMATION_STYLES),
            "width": 1080,
            "height": 1080,
            "error": "FAL_API_KEY no configurado — agrega tu key en /admin/settings",
        }

    # Determinar aspect ratio y dimensiones aproximadas
    fmt_key = CHANNEL_FORMAT_OVERRIDE.get(channel, format_type)
    aspect_ratio = FORMAT_ASPECT_RATIO.get(fmt_key, "1:1")
    w, h = APPROX_DIMENSIONS.get(aspect_ratio, (2048, 2048))

    brand_context = f"for {business_name}" if business_name else "for a business"
    enhanced_prompt = (
        f"Professional social media {format_type} visual {brand_context}. "
        f"{image_prompt}. "
        f"{QUALITY_SUFFIX}. "
        f"No watermarks, no text overlays, no logos."
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                FAL_MODEL_ENDPOINT,
                headers={
                    "Authorization": f"Key {settings.fal_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "prompt": enhanced_prompt,
                    "aspect_ratio": aspect_ratio,
                    "resolution": "2K",
                    "num_images": 1,
                    "output_format": "jpeg",
                    "safety_tolerance": "4",
                },
            )

            if response.status_code == 200:
                data = response.json()
                images = data.get("images", [])
                if images:
                    image_url = images[0].get("url")
                    animation = random.choice(ANIMATION_STYLES)
                    logger.info(
                        "image_generated",
                        model="nano-banana-2",
                        channel=channel,
                        format=format_type,
                        aspect_ratio=aspect_ratio,
                    )
                    return {
                        "image_url": image_url,
                        "animation_style": animation,
                        "width": w,
                        "height": h,
                        "error": None,
                        "mode": "text-to-image",
                    }
                else:
                    logger.error("image_generation_no_images", response=data)
                    return {
                        "image_url": None,
                        "animation_style": random.choice(ANIMATION_STYLES),
                        "width": w,
                        "height": h,
                        "error": f"nano-banana-2 no devolvió imágenes. {data.get('description', '')}",
                    }

            elif response.status_code == 401:
                logger.error("image_generation_auth_error")
                return {
                    "image_url": None,
                    "animation_style": "fade-in",
                    "width": w,
                    "height": h,
                    "error": "FAL_API_KEY inválida — verifica tu key en fal.ai",
                }
            elif response.status_code == 422:
                error_text = response.text[:500]
                logger.error("image_generation_validation_error", detail=error_text)
                return {
                    "image_url": None,
                    "animation_style": "fade-in",
                    "width": w,
                    "height": h,
                    "error": f"Parámetros inválidos: {error_text}",
                }
            else:
                error_text = response.text[:300]
                logger.error(
                    "image_generation_failed",
                    status=response.status_code,
                    detail=error_text,
                )
                return {
                    "image_url": None,
                    "animation_style": random.choice(ANIMATION_STYLES),
                    "width": w,
                    "height": h,
                    "error": f"fal.ai error {response.status_code}",
                }

    except httpx.TimeoutException:
        logger.error("image_generation_timeout", channel=channel, model="nano-banana-2")
        return {
            "image_url": None,
            "animation_style": "fade-in",
            "width": w,
            "height": h,
            "error": "Timeout al generar imagen — intenta de nuevo",
        }
    except Exception as e:
        logger.error("image_generation_error", error=str(e))
        return {
            "image_url": None,
            "animation_style": "fade-in",
            "width": 1080,
            "height": 1080,
            "error": str(e),
        }


async def generate_property_ad_image(
    property_image_url: str,
    image_prompt: str,
    format_type: str = "post",
    channel: str = "instagram",
    business_name: str = "",
) -> dict:
    """
    Genera una imagen publicitaria para una propiedad inmobiliaria usando
    fal.ai nano-banana-2 con un prompt ultra-detallado.

    nano-banana-2 es solo text-to-image, por lo que se usa el prompt de Claude
    (generado con IMAGE_PROMPT_MASTERS[property_listing]) enriquecido con
    descriptores de lujo y arquitectura para el mejor resultado posible.
    """
    brand_context = f"for {business_name}" if business_name else "for a luxury real estate agency"

    property_ad_prompt = (
        f"Stunning luxury real estate promotional advertisement {brand_context}. "
        f"{image_prompt}. "
        f"Ultra-realistic architectural exterior photography, golden hour dramatic lighting, "
        f"vibrant saturated colors, crystal clear blue sky with dramatic clouds, "
        f"perfect symmetrical composition, wide angle perspective showing grandeur and scale. "
        f"Architectural details sharp and clear, lush green landscaping, "
        f"premium materials visible: marble, glass, modern steel. "
        f"Style: Christie's International Real Estate, Sotheby's luxury listing, "
        f"Architectural Digest magazine cover quality. "
        f"{QUALITY_SUFFIX}. No watermarks, no text overlays, no logos."
    )

    result = await generate_social_image(
        image_prompt=property_ad_prompt,
        format_type=format_type,
        channel=channel,
        business_name=business_name,
    )
    result["mode"] = "text-to-image"
    return result
