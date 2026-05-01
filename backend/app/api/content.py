"""
Content API — Generación, gestión y publicación de contenido para redes sociales.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.business import Business
from app.models.content import SocialPost, ContentChannel, ContentStatus, ContentType
from app.models.subscription import Subscription, SubscriptionStatus, PLAN_LIMITS
from app.agents.content_agent import generate_post, generate_content_calendar, generate_image_prompt_from_post, generate_campaign_brief
from app.services.social_publisher import publish_post
from app.services.image_generator import generate_social_image, generate_property_ad_image
from app.services.heygen_service import create_video, get_video_status
from app.core.rate_limit import limiter
from fastapi import Request
from app.models.property import Property as PropertyModel
import structlog
import anthropic as _anthropic
from app.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/content", tags=["content"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class GeneratePostRequest(BaseModel):
    channel: str
    content_type: str = "educational"
    format_type: str = "post"        # "post" | "story" | "reel"
    topic: Optional[str] = None
    tone: str = "profesional pero cercano"
    generate_image: bool = False     # Generar imagen con fal.ai (Starter/Pro/Premium)
    generate_video: bool = False     # Generar video con HeyGen (solo Premium)
    use_image_url: Optional[str] = None  # Usar imagen de propiedad del stock (evita generación IA)

class GenerateCalendarRequest(BaseModel):
    days: int = 7
    channels: list[str] = ["instagram", "facebook"]
    content_theme: str = "mixed"       # mixed|properties|informativo|marca|testimonios|tendencias|promocional
    property_id: Optional[str] = None  # Propiedad específica para tema "properties"

class SchedulePostRequest(BaseModel):
    post_id: str
    scheduled_at: datetime

class UpdatePostRequest(BaseModel):
    caption: Optional[str] = None
    hook: Optional[str] = None
    hashtags: Optional[list[str]] = None
    image_url: Optional[str] = None
    status: Optional[str] = None

class SmartGenerateRequest(BaseModel):
    description: str                  # Descripción libre del usuario
    generate_image: bool = False      # Si quiere imagen generada también

class VideoStatusRequest(BaseModel):
    post_id: str

class MonthlyMarketingRequest(BaseModel):
    channels: list[str] = []  # vacío = la IA elige los canales óptimos


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_business(db: AsyncSession, user: User) -> Business:
    result = await db.execute(select(Business).where(Business.id == user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return business


def _business_ctx(b: Business) -> dict:
    return {
        "name": b.name or "",
        "industry": b.industry or "",
        "product_description": b.product_description or "",
        "pricing_info": b.pricing_info or "",
        "target_customer": b.target_customer or "",
        "value_proposition": b.value_proposition or "",
    }


async def _get_plan_limits(db: AsyncSession, business_id: str) -> dict:
    """Retorna los límites del plan activo del negocio."""
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.business_id == business_id,
            Subscription.status.in_([
                SubscriptionStatus.active,
                SubscriptionStatus.trialing,
            ]),
        )
        .order_by(desc(Subscription.created_at))
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return PLAN_LIMITS.get("trial", {})
    return PLAN_LIMITS.get(sub.plan.value, PLAN_LIMITS.get("trial", {}))


async def _do_publish(post_id: str, _unused_db: AsyncSession | None = None):
    """Tarea de background: publica el post en la red social y actualiza estado.
    Usa su propia sesión de DB para evitar problemas con la sesión de la petición HTTP.
    """
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(SocialPost).where(SocialPost.id == post_id))
            post = result.scalar_one_or_none()
            if not post:
                return

            # Obtener datos de Zernio del negocio
            biz_result = await db.execute(select(Business).where(Business.id == post.business_id))
            business = biz_result.scalar_one_or_none()
            zernio_profile_id = business.zernio_profile_id if business else None
            zernio_connected_platforms = business.zernio_connected_platforms if business else None

            caption_with_hashtags = post.caption
            if post.hashtags:
                # Instagram recomienda máx 5 hashtags; otros canales hasta 30
                channel = post.channel.value
                max_tags = 5 if channel == "instagram" else 30
                tags_list = post.hashtags[:max_tags]
                tags = " ".join(f"#{h.lstrip('#')}" for h in tags_list)
                caption_with_hashtags = f"{post.caption}\n\n{tags}"

            pub_result = await publish_post(
                channel=post.channel.value,
                caption=caption_with_hashtags,
                image_url=post.image_url,
                zernio_profile_id=zernio_profile_id,
                zernio_connected_platforms=zernio_connected_platforms,
                format_type=post.format_type,
            )

            post.status = ContentStatus.published if pub_result["success"] else ContentStatus.failed
            post.published_at = datetime.now(timezone.utc) if pub_result["success"] else None
            post.platform_post_id = pub_result.get("platform_post_id")
            post.platform_url = pub_result.get("platform_url")
            post.error_message = pub_result.get("error") if not pub_result["success"] else None
            await db.commit()
            logger.info("post_publish_done", post_id=post_id, success=pub_result["success"])
        except Exception as exc:
            logger.error("post_publish_background_error", post_id=post_id, error=str(exc))
            try:
                result2 = await db.execute(select(SocialPost).where(SocialPost.id == post_id))
                post2 = result2.scalar_one_or_none()
                if post2:
                    post2.status = ContentStatus.failed
                    post2.error_message = f"Error interno: {str(exc)[:200]}"
                    await db.commit()
            except Exception:
                pass


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/plan-features")
async def get_plan_features(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna las características de contenido disponibles según el plan actual."""
    limits = await _get_plan_limits(db, current_user.business_id)
    return {
        "content_channels":        limits.get("content_channels", ["facebook", "instagram"]),
        "content_formats":         limits.get("content_formats", ["post", "story"]),
        "image_generation":        limits.get("image_generation", False),
        "video_generation":        limits.get("video_generation", False),
        "heygen":                  limits.get("heygen", False),
        "content_posts_per_month": limits.get("content_posts_per_month", 5),
    }


async def _save_campaign_posts(
    business_id: str,
    brief: dict,
    enriched_ctx: dict,
    channels: list[str],
) -> None:
    """Genera el calendario completo y guarda los posts como borradores en background."""
    from datetime import date as _date
    from app.database import AsyncSessionLocal

    try:
        # Frecuencia: cada 2 días por canal (~15 posts/canal/mes)
        # Generamos posts solo en días pares para no saturar
        FREQUENCY_DAYS = 2  # publicar 1 de cada N días
        active_days = [d for d in range(30) if d % FREQUENCY_DAYS == 0]  # 0,2,4,...28 → 15 días
        calendar_full = await generate_content_calendar(
            business_context=enriched_ctx,
            days=30,
            channels=channels,
            content_theme=brief.get("content_theme", "mixed"),
        )
        # Filtrar solo los días activos
        calendar = [p for p in calendar_full if (p.get("day_number", 1) - 1) % FREQUENCY_DAYS == 0]
        async with AsyncSessionLocal() as db:
            posts_saved = 0
            for item in calendar:
                scheduled_dt = None
                if item.get("scheduled_date"):
                    try:
                        d = _date.fromisoformat(item["scheduled_date"])
                        scheduled_dt = datetime(d.year, d.month, d.day, 10, 0, 0, tzinfo=timezone.utc)
                    except Exception:
                        pass

                raw_ct = item.get("content_type", "educational")
                try:
                    ct_enum = ContentType(raw_ct)
                except ValueError:
                    ct_enum = ContentType("product")

                post = SocialPost(
                    id=str(uuid.uuid4()),
                    business_id=business_id,
                    channel=ContentChannel(item["channel"]),
                    content_type=ct_enum,
                    format_type=item.get("format_type", "post"),
                    status=ContentStatus.draft,
                    hook=item.get("hook"),
                    caption=item.get("caption", ""),
                    hashtags=item.get("hashtags", []),
                    image_prompt=item.get("suggested_image_prompt"),
                    image_url=item.get("property_image_url"),
                    scheduled_at=scheduled_dt,
                    ai_metadata={
                        "estimated_reach": item.get("estimated_reach"),
                        "best_time_to_post": item.get("best_time_to_post"),
                        "day_number": item.get("day_number"),
                        "scheduled_date": item.get("scheduled_date"),
                        "campaign_name": brief.get("campaign_name"),
                        "content_theme": brief.get("content_theme"),
                        "generated_by": "monthly-campaign",
                    },
                )
                db.add(post)
                posts_saved += 1
            await db.commit()
        logger.info(
            "monthly_campaign_created",
            campaign=brief.get("campaign_name"),
            total_posts=posts_saved,
            channels=channels,
        )
    except Exception as exc:
        logger.error("monthly_campaign_background_failed", error=str(exc))


@router.post("/generate-monthly-campaign")
@limiter.limit("3/minute")
async def generate_monthly_campaign(
    request: Request,
    data: MonthlyMarketingRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """IA lee los datos del negocio, diseña una campaña mensual y lanza la generación
    de 30 días de posts en segundo plano. Retorna el brief al instante."""
    business = await _get_business(db, current_user)
    limits = await _get_plan_limits(db, current_user.business_id)
    allowed_channels = limits.get("content_channels", ["facebook", "instagram"])
    ctx = _business_ctx(business)

    # ── Paso 1: Claude diseña el brief (rápido, ~5 s) ─────────────────────────
    brief = await generate_campaign_brief(ctx, allowed_channels)

    # ── Paso 2: Determinar canales finales ─────────────────────────────────────
    channels = data.channels if data.channels else brief.get("channels", allowed_channels[:2])
    channels = [c for c in channels if c in allowed_channels][:3]
    if not channels:
        channels = allowed_channels[:2]

    # ── Paso 3: Enriquecer contexto y delegar generación a background ──────────
    enriched_ctx = {
        **ctx,
        "campaign_name": brief.get("campaign_name", ""),
        "campaign_objective": brief.get("objective", ""),
        "campaign_tone": brief.get("tone", ""),
        "key_messages": ", ".join(brief.get("key_messages", [])),
    }
    background_tasks.add_task(
        _save_campaign_posts,
        business_id=business.id,
        brief=brief,
        enriched_ctx=enriched_ctx,
        channels=channels,
    )

    # Estimado: 15 días activos (cada 2 días) × len(channels)
    estimated_posts = 15 * len(channels)
    return {
        "campaign": brief,
        "total_posts": estimated_posts,
        "channels": channels,
        "status": "generating",
        "message": f"Campaña '{brief.get('campaign_name')}' iniciada · ~{estimated_posts} posts se generarán en los próximos minutos",
    }


@router.post("/generate-smart")
@limiter.limit("15/minute")
async def generate_smart(
    request: Request,
    data: SmartGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El agente IA analiza la descripción libre y configura todos los parámetros
    del post automáticamente: canal, tipo, formato, tema y caption."""
    if not data.description.strip():
        raise HTTPException(status_code=422, detail="Descripción requerida")

    business = await _get_business(db, current_user)
    limits = await _get_plan_limits(db, current_user.business_id)
    allowed_channels = limits.get("content_channels", ["facebook", "instagram"])
    allowed_formats = limits.get("content_formats", ["post", "story"])
    ctx = _business_ctx(business)

    # ── Paso 1: Claude decide los parámetros óptimos ──────────────────────────
    ai_client = _anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    param_prompt = f"""Eres un experto en marketing digital para agencias inmobiliarias.

Negocio: {ctx['name']} | Industria: {ctx['industry']}
Descripción: {ctx['product_description']}
Cliente ideal: {ctx['target_customer']}

Solicitud del usuario: "{data.description}"

Canales disponibles: {allowed_channels}
Formatos disponibles: {allowed_formats}
Tipos de contenido: educational, testimonial, product, engagement, trend, behind_scenes

Analiza la solicitud y elige los parámetros ÓPTIMOS para maximizar engagement.
Responde ÚNICAMENTE con JSON válido, sin explicaciones:
{{
  "channel": "<uno de {allowed_channels}>",
  "content_type": "<educational|testimonial|product|engagement|trend|behind_scenes>",
  "format_type": "<uno de {allowed_formats}>",
  "topic": "<tema concreto en español, máx 10 palabras>",
  "tone": "<tono recomendado en 3-5 palabras>",
  "rationale": "<1 línea explicando por qué estos parámetros>"
}}"""

    import json as _json
    param_resp = await ai_client.messages.create(
        model=settings.claude_model,
        max_tokens=300,
        messages=[{"role": "user", "content": param_prompt}],
    )
    raw = param_resp.content[0].text.strip()
    if "```" in raw:
        raw = raw.split("```json")[-1].split("```")[0].strip() if "```json" in raw else raw.split("```")[1].split("```")[0].strip()
    params = _json.loads(raw)

    # Asegurar que los parámetros estén dentro del plan
    channel = params.get("channel", allowed_channels[0])
    if channel not in allowed_channels:
        channel = allowed_channels[0]
    format_type = params.get("format_type", allowed_formats[0])
    if format_type not in allowed_formats:
        format_type = allowed_formats[0]
    content_type = params.get("content_type", "educational")
    topic = params.get("topic", data.description[:60])
    tone = params.get("tone", "profesional pero cercano")

    logger.info("smart_params_decided", channel=channel, type=content_type,
                format=format_type, topic=topic, rationale=params.get("rationale", ""))

    # ── Paso 2: Generar el post con los parámetros decididos ──────────────────
    ai_data = await generate_post(
        business_context=ctx,
        channel=channel,
        content_type=content_type,
        topic=topic,
        tone=tone,
        format_type=format_type,
    )

    # ── Paso 3: Imagen (opcional) — Claude lee el post y crea prompt contextualizado ──
    image_url = None
    animation_style = None
    image_error = None
    final_image_prompt = ai_data.get("suggested_image_prompt", "")
    if data.generate_image and limits.get("image_generation", False):
        # Claude re-lee el caption generado y crea un prompt visual alineado al mensaje
        final_image_prompt = await generate_image_prompt_from_post(
            caption=ai_data.get("caption", ""),
            hook=ai_data.get("hook"),
            hashtags=ai_data.get("hashtags", []),
            content_type=content_type,
            channel=channel,
            format_type=format_type,
            business_context=ctx,
        )
        image_result = await generate_social_image(
            image_prompt=final_image_prompt,
            format_type=format_type,
            channel=channel,
            business_name=ctx["name"],
        )
        image_url = image_result.get("image_url")
        animation_style = image_result.get("animation_style", "fade-in")
        image_error = image_result.get("error")

    # ── Paso 4: Guardar en BD ─────────────────────────────────────────────────
    post = SocialPost(
        id=str(uuid.uuid4()),
        business_id=business.id,
        channel=ContentChannel(channel),
        content_type=ContentType(content_type),
        format_type=format_type,
        status=ContentStatus.draft,
        hook=ai_data.get("hook"),
        caption=ai_data.get("caption", ""),
        hashtags=ai_data.get("hashtags", []),
        image_prompt=final_image_prompt,
        image_url=image_url,
        animation_style=animation_style,
        ai_metadata={
            "estimated_reach": ai_data.get("estimated_reach"),
            "best_time_to_post": ai_data.get("best_time_to_post"),
            "smart_rationale": params.get("rationale"),
            "image_error": image_error,
            "generated_by": "smart-ai",
        },
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    return {
        "id": post.id,
        "channel": post.channel.value,
        "content_type": post.content_type.value,
        "format_type": post.format_type,
        "status": post.status.value,
        "hook": post.hook,
        "caption": post.caption,
        "hashtags": post.hashtags,
        "image_prompt": post.image_prompt,
        "image_url": post.image_url,
        "animation_style": post.animation_style,
        "video_job_id": None,
        "ai_metadata": post.ai_metadata,
        "created_at": post.created_at,
        "_smart_params": {"channel": channel, "content_type": content_type,
                          "format_type": format_type, "topic": topic,
                          "rationale": params.get("rationale")},
    }


@router.post("/generate")
async def generate(
    request: Request,
    data: GeneratePostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera un post con IA y lo guarda como borrador."""
    try:
        return await _generate_impl(request, data, db, current_user)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("content_generate_unhandled", channel=data.channel, format=data.format_type,
                     content_type=data.content_type, error=str(exc), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno al generar post ({data.channel}/{data.format_type}): {exc}")


async def _generate_impl(
    request: Request,
    data: GeneratePostRequest,
    db: AsyncSession,
    current_user: User,
):
    """Genera un post con IA y lo guarda como borrador."""
    business = await _get_business(db, current_user)
    limits = await _get_plan_limits(db, current_user.business_id)

    # ── Validación de canal según plan ────────────────────────────────────────
    allowed_channels = limits.get("content_channels", ["facebook", "instagram"])
    if data.channel not in allowed_channels:
        raise HTTPException(
            status_code=403,
            detail=f"Canal '{data.channel}' no disponible en tu plan. "
                   f"Canales permitidos: {', '.join(allowed_channels)}. "
                   f"Actualiza al plan Premium para acceder a TikTok y LinkedIn.",
        )

    # ── Validación de formato según plan ─────────────────────────────────────
    allowed_formats = limits.get("content_formats", ["post", "story"])
    # TikTok siempre requiere reel (video) — permitir aunque el plan no lo liste explícitamente
    if data.channel == "tiktok" and data.format_type == "reel":
        pass  # siempre permitido para TikTok
    elif data.format_type not in allowed_formats:
        raise HTTPException(
            status_code=403,
            detail=f"Formato '{data.format_type}' no disponible en tu plan. "
                   f"Formatos permitidos: {', '.join(allowed_formats)}.",
        )

    # ── Validación de generación de imagen ────────────────────────────────────
    if data.generate_image and not limits.get("image_generation", False):
        raise HTTPException(
            status_code=403,
            detail="La generación de imágenes no está disponible en el plan Trial. "
                   "Actualiza al plan Starter o superior.",
        )

    # ── Validación de video HeyGen ────────────────────────────────────────────
    if data.generate_video and not limits.get("heygen", False):
        raise HTTPException(
            status_code=403,
            detail="La generación de videos con HeyGen está disponible solo en el plan Premium.",
        )

    ctx = _business_ctx(business)

    # ── Generar contenido con Claude ──────────────────────────────────────────
    try:
        ai_data = await generate_post(
            business_context=ctx,
            channel=data.channel,
            content_type=data.content_type,
            topic=data.topic,
            tone=data.tone,
            format_type=data.format_type,
        )
    except Exception as e:
        logger.error("content_generate_ai_error", channel=data.channel, format=data.format_type, error=str(e))
        raise HTTPException(status_code=502, detail=f"Error al generar contenido con IA: {e}")

    # ── Generar imagen con fal.ai (si se solicita y no hay imagen de propiedad) ──────
    image_url = data.use_image_url or None
    animation_style = None
    image_error = None

    if data.generate_image and not data.use_image_url:
        image_result = await generate_social_image(
            image_prompt=ai_data.get("suggested_image_prompt", ""),
            format_type=data.format_type,
            channel=data.channel,
            business_name=ctx["name"],
        )
        image_url = image_result.get("image_url")
        animation_style = image_result.get("animation_style", "fade-in")
        image_error = image_result.get("error")

    # ── Generar video con HeyGen (si se solicita) ─────────────────────────────
    video_job_id = None
    video_error = None

    if data.generate_video:
        # Usamos el caption como script del video
        script = ai_data.get("video_script") or ai_data.get("caption", "")
        video_result = await create_video(
            script=script,
            format_type=data.format_type,
        )
        video_job_id = video_result.get("video_id")
        video_error = video_result.get("error")

    # ── Guardar post en base de datos ─────────────────────────────────────────
    post = SocialPost(
        id=str(uuid.uuid4()),
        business_id=business.id,
        channel=ContentChannel(data.channel),
        content_type=ContentType(data.content_type),
        format_type=data.format_type,
        status=ContentStatus.draft,
        hook=ai_data.get("hook"),
        caption=ai_data.get("caption", ""),
        hashtags=ai_data.get("hashtags", []),
        image_prompt=ai_data.get("suggested_image_prompt"),
        image_url=image_url,
        animation_style=animation_style,
        video_job_id=video_job_id,
        ai_metadata={
            "estimated_reach": ai_data.get("estimated_reach"),
            "best_time_to_post": ai_data.get("best_time_to_post"),
            "video_script": ai_data.get("video_script"),
            "image_error": image_error,
            "video_error": video_error,
        },
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    return {
        "id": post.id,
        "channel": post.channel.value,
        "content_type": post.content_type.value,
        "format_type": post.format_type,
        "status": post.status.value,
        "hook": post.hook,
        "caption": post.caption,
        "hashtags": post.hashtags,
        "image_prompt": post.image_prompt,
        "image_url": post.image_url,
        "animation_style": post.animation_style,
        "video_job_id": post.video_job_id,
        "ai_metadata": post.ai_metadata,
        "created_at": post.created_at,
    }


@router.post("/generate-calendar")
@limiter.limit("5/minute")
async def generate_calendar(
    request: Request,
    data: GenerateCalendarRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera un calendario de contenido completo para N días."""
    limits = await _get_plan_limits(db, current_user.business_id)
    allowed_channels = limits.get("content_channels", ["facebook", "instagram"])

    # Filtrar canales no permitidos en el plan
    channels = [c for c in data.channels if c in allowed_channels]
    if not channels:
        channels = [allowed_channels[0]]

    business = await _get_business(db, current_user)
    ctx = _business_ctx(business)

    # ── Cargar propiedades del catálogo si el tema las requiere ──────────────
    properties_ctx: list[dict] = []
    if data.content_theme == "properties":
        if data.property_id:
            # Propiedad específica
            result = await db.execute(
                select(PropertyModel).where(
                    PropertyModel.id == data.property_id,
                    PropertyModel.business_id == current_user.business_id,
                )
            )
            prop = result.scalar_one_or_none()
            if prop:
                properties_ctx = [{
                    "title": prop.title, "property_type": prop.property_type,
                    "operation_type": prop.operation_type, "price": prop.price,
                    "currency": prop.currency, "bedrooms": prop.bedrooms,
                    "bathrooms": prop.bathrooms, "area_m2": prop.area_m2,
                    "neighborhood": prop.neighborhood, "city": prop.city,
                    "description": prop.description, "amenities": prop.amenities or [],
                    "cover_image_url": prop.cover_image_url,
                }]
        else:
            # Todas las propiedades disponibles del negocio
            result = await db.execute(
                select(PropertyModel).where(
                    PropertyModel.business_id == current_user.business_id,
                    PropertyModel.is_active == True,
                ).limit(10)
            )
            props = result.scalars().all()
            properties_ctx = [{
                "title": p.title, "property_type": p.property_type,
                "operation_type": p.operation_type, "price": p.price,
                "currency": p.currency, "bedrooms": p.bedrooms,
                "bathrooms": p.bathrooms, "area_m2": p.area_m2,
                "neighborhood": p.neighborhood, "city": p.city,
                "description": p.description, "amenities": p.amenities or [],
                "cover_image_url": p.cover_image_url,
            } for p in props]

    calendar = await generate_content_calendar(
        business_context=ctx,
        days=min(data.days, 30),
        channels=channels,
        content_theme=data.content_theme,
        properties=properties_ctx if properties_ctx else None,
    )

    # Guardar todos los posts como drafts
    posts = []
    for item in calendar:
        # Convertir scheduled_date a datetime para guardar en DB
        from datetime import date
        scheduled_dt = None
        if item.get("scheduled_date"):
            try:
                d = date.fromisoformat(item["scheduled_date"])
                scheduled_dt = datetime(d.year, d.month, d.day, 10, 0, 0, tzinfo=timezone.utc)
            except Exception:
                pass

        # Mapear content_type: si "property_listing" no existe en el enum, usar "product"
        raw_ct = item.get("content_type", "educational")
        try:
            ct_enum = ContentType(raw_ct)
        except ValueError:
            ct_enum = ContentType("product")

        post = SocialPost(
            id=str(uuid.uuid4()),
            business_id=business.id,
            channel=ContentChannel(item["channel"]),
            content_type=ct_enum,
            format_type=item.get("format_type", "post"),
            status=ContentStatus.draft,
            hook=item.get("hook"),
            caption=item.get("caption", ""),
            hashtags=item.get("hashtags", []),
            image_prompt=item.get("suggested_image_prompt"),
            image_url=item.get("property_image_url"),  # usa imagen de propiedad si existe
            scheduled_at=scheduled_dt,
            ai_metadata={
                "estimated_reach": item.get("estimated_reach"),
                "best_time_to_post": item.get("best_time_to_post"),
                "day_number": item.get("day_number"),
                "scheduled_date": item.get("scheduled_date"),
                "content_theme": data.content_theme,
            },
        )
        db.add(post)
        posts.append(post)

    await db.commit()
    return {"total": len(posts), "message": f"{len(posts)} posts generados como borradores"}


@router.get("/posts")
async def list_posts(
    channel: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos los posts del negocio."""
    q = select(SocialPost).where(SocialPost.business_id == current_user.business_id)
    if channel:
        q = q.where(SocialPost.channel == channel)
    if status:
        q = q.where(SocialPost.status == status)
    q = q.order_by(desc(SocialPost.created_at)).limit(limit).offset(offset)

    result = await db.execute(q)
    posts = result.scalars().all()

    return [
        {
            "id": p.id,
            "channel": p.channel.value,
            "content_type": p.content_type.value,
            "format_type": getattr(p, "format_type", "post") or "post",
            "status": p.status.value,
            "hook": p.hook,
            "caption": p.caption,
            "hashtags": p.hashtags or [],
            "image_url": p.image_url,
            "image_prompt": p.image_prompt,
            "animation_style": getattr(p, "animation_style", None),
            "video_url": getattr(p, "video_url", None),
            "video_job_id": getattr(p, "video_job_id", None),
            "platform_url": p.platform_url,
            "error_message": p.error_message,
            "scheduled_at": p.scheduled_at,
            "published_at": p.published_at,
            "ai_metadata": p.ai_metadata or {},
            "created_at": p.created_at,
        }
        for p in posts
    ]


@router.patch("/posts/{post_id}")
async def update_post(
    post_id: str,
    data: UpdatePostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edita caption, imagen o aprueba un post borrador."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.id == post_id,
            SocialPost.business_id == current_user.business_id,
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    if data.caption is not None:
        post.caption = data.caption
    if data.hook is not None:
        post.hook = data.hook
    if data.hashtags is not None:
        post.hashtags = data.hashtags
    if data.image_url is not None:
        post.image_url = data.image_url
    if data.status in ("approved", "draft"):
        post.status = ContentStatus(data.status)

    await db.commit()
    return {"id": post.id, "status": post.status.value}


@router.post("/posts/{post_id}/approve")
async def approve_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aprueba un borrador para publicación."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.id == post_id,
            SocialPost.business_id == current_user.business_id,
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    post.status = ContentStatus.approved
    await db.commit()
    return {"id": post.id, "status": "approved"}


@router.post("/posts/{post_id}/publish")
async def publish_now(
    post_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Publica un post inmediatamente en la red social."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.id == post_id,
            SocialPost.business_id == current_user.business_id,
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    if post.status == ContentStatus.published:
        raise HTTPException(status_code=400, detail="El post ya fue publicado")
    if post.status == ContentStatus.draft:
        raise HTTPException(status_code=400, detail="Debes aprobar el post antes de publicarlo")
    if post.status == ContentStatus.scheduled:
        raise HTTPException(status_code=400, detail="El post ya está en proceso de publicación")

    post.status = ContentStatus.scheduled
    await db.commit()

    background_tasks.add_task(_do_publish, post_id)
    return {"id": post_id, "status": "publishing", "message": "Publicando en background..."}


@router.post("/posts/{post_id}/schedule")
async def schedule_post(
    post_id: str,
    data: SchedulePostRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Programa un post para publicación futura."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.id == post_id,
            SocialPost.business_id == current_user.business_id,
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    post.status = ContentStatus.scheduled
    post.scheduled_at = data.scheduled_at
    await db.commit()
    return {"id": post_id, "status": "scheduled", "scheduled_at": post.scheduled_at}


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina un post (solo si no está publicado)."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.id == post_id,
            SocialPost.business_id == current_user.business_id,
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    if post.status == ContentStatus.published:
        raise HTTPException(status_code=400, detail="No se puede eliminar un post ya publicado")

    await db.delete(post)
    await db.commit()
    return {"deleted": post_id}


@router.get("/stats")
async def content_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumen de contenido por estado y canal."""
    from sqlalchemy import func

    result = await db.execute(
        select(SocialPost.status, SocialPost.channel, func.count())
        .where(SocialPost.business_id == current_user.business_id)
        .group_by(SocialPost.status, SocialPost.channel)
    )
    rows = result.all()

    stats: dict = {"total": 0, "by_status": {}, "by_channel": {}}
    for status, channel, count in rows:
        stats["total"] += count
        stats["by_status"][status.value] = stats["by_status"].get(status.value, 0) + count
        stats["by_channel"][channel.value] = stats["by_channel"].get(channel.value, 0) + count

    return stats


@router.post("/posts/{post_id}/generate-image")
async def generate_post_image(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera o regenera la imagen de un post existente usando fal.ai nano-banana-2.
    Para todos los posts usa text-to-image con el prompt sugerido por Claude,
    enriquecido con el master prompt de la categoría.
    """
    result_q = await db.execute(
        select(SocialPost).where(
            SocialPost.id == post_id,
            SocialPost.business_id == current_user.business_id,
        )
    )
    post = result_q.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    business = await _get_business(db, current_user)
    meta = post.ai_metadata or {}

    # ── Claude lee el post y crea el prompt de imagen contextualizado ────────
    # Si Claude no está disponible (sin créditos), usar el prompt guardado en el post
    ctx = _business_ctx(business)
    smart_image_prompt = None
    try:
        smart_image_prompt = await generate_image_prompt_from_post(
            caption=post.caption or "",
            hook=post.hook,
            hashtags=post.hashtags or [],
            content_type=post.content_type.value,
            channel=post.channel.value,
            format_type=post.format_type or "post",
            business_context=ctx,
        )
    except Exception as e:
        logger.warning("image_prompt_claude_failed", error=str(e))

    # Fallback: usar el prompt guardado en el post o construir uno básico
    if not smart_image_prompt:
        smart_image_prompt = (
            post.image_prompt
            or f"Professional {post.channel.value} {post.format_type or 'post'} visual for {business.name or 'a business'}. "
               f"{post.caption[:120] if post.caption else 'Modern lifestyle product photography'}. "
               f"Clean composition, vibrant colors."
        )
        logger.info("image_prompt_fallback_used", post_id=post_id)

    # Guardar el nuevo prompt en el post
    post.image_prompt = smart_image_prompt

    # Obtener URL de propiedad guardada en metadata (para i2i si aplica)
    property_image_url = meta.get("property_image_url")
    # Usar image-to-image sólo con fotos reales de propiedad (no re-procesar imágenes ya generadas)
    use_i2i = (
        property_image_url
        and property_image_url.startswith("https://")
        and "fal.media" not in property_image_url
    )

    if use_i2i:
        image_result = await generate_property_ad_image(
            property_image_url=property_image_url,
            image_prompt=smart_image_prompt,
            format_type=post.format_type or "post",
            channel=post.channel.value,
            business_name=business.name or "",
        )
    else:
        image_result = await generate_social_image(
            image_prompt=smart_image_prompt,
            format_type=post.format_type or "post",
            channel=post.channel.value,
            business_name=business.name or "",
        )

    new_image_url = image_result.get("image_url")
    if new_image_url:
        post.image_url = new_image_url
        post.animation_style = image_result.get("animation_style", "fade-in")
        post.ai_metadata = {**meta, "image_error": None, "image_mode": image_result.get("mode", "t2i")}
        await db.commit()
        await db.refresh(post)

    logger.info(
        "post_image_generated",
        post_id=post_id,
        mode=image_result.get("mode"),
        success=bool(new_image_url),
    )
    return {
        "id": post.id,
        "image_url": new_image_url,
        "animation_style": image_result.get("animation_style"),
        "mode": image_result.get("mode"),
        "error": image_result.get("error"),
    }


@router.get("/posts/{post_id}/video-status")
async def check_video_status(
    post_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Consulta el estado de un video HeyGen en proceso."""
    result = await db.execute(
        select(SocialPost).where(
            SocialPost.id == post_id,
            SocialPost.business_id == current_user.business_id,
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    video_job_id = getattr(post, "video_job_id", None)
    if not video_job_id:
        raise HTTPException(status_code=400, detail="Este post no tiene un video en proceso")

    status_data = await get_video_status(video_job_id)

    # Si el video está listo, guardar la URL
    if status_data.get("status") == "completed" and status_data.get("video_url"):
        post.video_url = status_data["video_url"]
        await db.commit()

    return {
        "post_id": post_id,
        "video_job_id": video_job_id,
        **status_data,
    }

