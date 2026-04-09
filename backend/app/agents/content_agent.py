"""
Content Agent — Genera contenido para redes sociales usando Claude.
Usa el contexto del negocio para crear posts relevantes, persuasivos
y adaptados al tono de cada red social.
"""
from anthropic import AsyncAnthropic
from app.config import settings
import structlog

logger = structlog.get_logger()

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

CHANNEL_SPECS = {
    "instagram": {
        "max_chars": 2200,
        "style": "Visual, emotivo, con llamada a la acción. Usa emojis con moderación. Incluye entre 5-10 hashtags relevantes al final.",
        "format": "Caption para imagen, carrusel o story",
    },
    "facebook": {
        "max_chars": 63206,
        "style": "Conversacional, informativo, con pregunta al final para generar engagement. Emojis opcionales.",
        "format": "Post de texto o con imagen",
    },
    "linkedin": {
        "max_chars": 3000,
        "style": "Profesional, orientado a valor de negocio. Sin emojis excesivos. Storytelling o insight del sector. Hashtags al final (3-5 max). Formato con saltos de línea estratégicos para facilitar lectura.",
        "format": "Post profesional B2B con hook poderoso en la primera línea",
    },
    "twitter": {
        "max_chars": 280,
        "style": "Directo, impactante, con gancho en las primeras palabras. Máximo 2 hashtags.",
        "format": "Tweet conciso",
    },
    "tiktok": {
        "max_chars": 2200,
        "style": "Dinámico, entretenido, con gancho en los primeros 3 segundos. Usa lenguaje joven y auténtico. Emojis expresivos. Hashtags de tendencia (#fyp #parati). Orientado a video vertical.",
        "format": "Caption para video TikTok + ideas de guión para el video",
    },
}

CONTENT_TYPES = {
    "educational":       "Contenido educativo que enseña algo valioso sobre el sector o el problema que resuelve el producto",
    "testimonial":       "Historia de éxito o resultado de cliente (ficticio pero creíble basado en el ICP)",
    "product":           "Destacar una característica o beneficio específico del producto/servicio",
    "engagement":        "Pregunta o poll para generar comentarios y aumentar alcance orgánico",
    "trend":             "Contenido relacionado con una tendencia del sector para ganar visibilidad",
    "behind_scenes":     "Contenido 'detrás de escena' que humaniza la marca",
    "property_listing":  "Publicidad de una propiedad específica del catálogo inmobiliario. Destaca sus características únicas, precio, ubicación y beneficios de vida. Crea deseo y urgencia de manera natural. Incluye llamada a acción para agendar visita o contactar al agente.",
}

# Distribuciones por tema del calendario
THEME_DISTRIBUTIONS = {
    "mixed":       ["educational","educational","educational","product","product","testimonial","engagement"],
    "properties":  ["property_listing","property_listing","property_listing","property_listing","educational","engagement","testimonial"],
    "informativo": ["educational","educational","educational","educational","trend","engagement","educational"],
    "marca":       ["behind_scenes","behind_scenes","testimonial","testimonial","educational","engagement","behind_scenes"],
    "testimonios": ["testimonial","testimonial","testimonial","educational","engagement","testimonial","product"],
    "tendencias":  ["trend","trend","trend","educational","trend","engagement","trend"],
    "promocional": ["product","product","testimonial","engagement","product","product","testimonial"],
}

# ── Master prompts de imagen por categoría de contenido ─────────────────────
# Claude usa estos como base y los enriquece con el contexto específico del negocio/propiedad
IMAGE_PROMPT_MASTERS = {
    "educational": (
        "Clean, modern editorial infographic-style visual. Split-panel composition: left side shows "
        "the PROBLEM (cluttered, stressful, outdated) vs right side shows the SOLUTION (clean, modern, aspirational). "
        "Swiss graphic design meets modern digital illustration. Pastel color palette with one bold accent color. "
        "Generous negative space for text overlay. No text in image. Mood: trustworthy, educational, premium. "
        "Style: Harvard Business Review meets modern fintech branding."
    ),
    "testimonial": (
        "Warm, authentic lifestyle photography of a happy Latin American professional (30-45 years old) "
        "celebrating a real estate milestone — holding keys, standing in front of new home, or in a "
        "bright modern interior. Candid documentary style, golden hour warm light, shallow depth of field. "
        "Color palette: warm ivory, golden tones, soft cream. Cinematic color grading. "
        "Mood: joy, success, life achievement, aspiration. Authentic, not staged."
    ),
    "product": (
        "Premium commercial hero shot for a real estate service or property. Ultra-clean composition "
        "with dramatic studio-style lighting, deep shadows, strong rim light. Minimalist background "
        "with a subtle gradient. The hero element fills 60% of the frame. "
        "Style: high-end real estate brochure meets Apple product photography. "
        "Mood: exclusive, trustworthy, premium, professional."
    ),
    "engagement": (
        "Bold, eye-catching social-first graphic design. Strong geometric shapes, maximum contrast, "
        "vivid complementary color palette. Central focal point with radial composition. "
        "Flat illustration style with subtle 3D shadows. Dynamic diagonal energy lines. "
        "Style: Dribbble-quality social media graphic, 2025 design trends. "
        "Mood: energetic, playful, scroll-stopping, inviting interaction."
    ),
    "trend": (
        "Bold editorial visual with trend-forward design language. Dynamic diagonal composition, "
        "sharp geometric angles, magazine cover energy. 2025 color trends: terracotta, sage green, "
        "midnight navy, warm sand. Data visualization elements used as decorative graphic motifs "
        "(arrows, minimal charts, percentage circles). Style: Architectural Digest meets Fast Company. "
        "Mood: forward-thinking, influential, authoritative."
    ),
    "behind_scenes": (
        "Candid, authentic documentary-style photography. Natural window light, genuine human moments "
        "— team meeting, showing a property, working at a modern desk, handshake closing a deal. "
        "Shallow depth of field, warm natural color grading, film-like texture. "
        "Style: Instagram Stories meets corporate documentary. "
        "Mood: transparent, human, approachable, trustworthy."
    ),
    "property_listing": (
        "Luxury real estate advertisement photography at golden hour. Hero shot of the most impressive "
        "architectural feature — grand facade, infinity pool, panoramic city view, sweeping living room. "
        "Perfect 'magic hour' warm orange-gold light, crystal clear sky with dramatic clouds, "
        "perfectly trimmed landscaping. Wide angle perspective emphasizing space and grandeur. "
        "Symmetrical or rule-of-thirds architectural composition. Deep blue reflections in pool or windows. "
        "Style: Christie's International Real Estate, One Sotheby's listing photography, "
        "Architectural Digest editorial. Mood: aspirational, exclusive, dream-home quality."
    ),
}

# Instrucciones de imagen por formato
FORMAT_IMAGE_STYLE = {
    "post":  "square composition (1:1), balanced and centered subject, clean background",
    "story": "vertical composition (9:16 portrait), bold text-friendly layout, eye-catching hero element at top, call-to-action space at bottom",
    "reel":  "vertical composition (9:16 portrait), dynamic and energetic, thumbnail-style frame that would look good as video cover",
}


async def generate_post(
    business_context: dict,
    channel: str,
    content_type: str,
    topic: str | None = None,
    tone: str = "profesional pero cercano",
    format_type: str = "post",
    property_context: dict | None = None,
) -> dict:
    """
    Genera un post completo para una red social específica.
    Retorna: { caption, hashtags, suggested_image_prompt, hook, video_script }
    """
    channel_spec = CHANNEL_SPECS.get(channel, CHANNEL_SPECS["instagram"])
    content_desc = CONTENT_TYPES.get(content_type, CONTENT_TYPES["educational"])
    format_style = FORMAT_IMAGE_STYLE.get(format_type, FORMAT_IMAGE_STYLE["post"])

    topic_line = f"\nTema específico a tratar: {topic}" if topic else ""

    # Bloque de propiedad (si aplica)
    property_block = ""
    image_instruction = ""
    if property_context:
        price_str = f"{property_context.get('currency','USD')} {property_context.get('price',0):,.0f}" if property_context.get('price') else "consultar"
        amenities_str = ", ".join(property_context.get("amenities", [])) or "ver descripción"
        property_block = f"""
PROPIEDAD A PUBLICITAR:
- Título: {property_context.get('title', '')}
- Tipo: {property_context.get('property_type', '')}
- Operación: {property_context.get('operation_type', 'venta')}
- Precio: {price_str}
- Ubicación: {property_context.get('neighborhood', '')}, {property_context.get('city', '')}
- Recámaras: {property_context.get('bedrooms', '')} | Baños: {property_context.get('bathrooms', '')} | Área: {property_context.get('area_m2', '')} sqft
- Descripción: {property_context.get('description', '')}
- Amenidades: {amenities_str}
IMPORTANTE: Crea el anuncio específicamente para ESTA propiedad. Usa sus datos reales."""
        if property_context.get("cover_image_url"):
            image_instruction = f'\n"property_image_url": "{property_context["cover_image_url"]}",'
    format_note = ""
    if format_type == "story":
        format_note = "\nFormato: STORY vertical (9:16). El copy debe ser corto e impactante (máx 3 líneas)."
    elif format_type == "reel":
        format_note = "\nFormato: REEL/VIDEO vertical. Incluye ideas concretas de guión de 30-60 segundos."

    system_prompt = f"""Eres un experto en marketing digital y copywriting para el mercado inmobiliario LATAM.
Tu especialidad es crear contenido para redes sociales que genera engagement real y convierte seguidores en compradores.

Negocio: {business_context.get('name', 'Empresa')}
Industria: {business_context.get('industry', 'Bienes raíces')}
Producto/Servicio: {business_context.get('product_description', '')}
Cliente ideal: {business_context.get('target_customer', '')}
Propuesta de valor: {business_context.get('value_proposition', '')}
{property_block}

Red social objetivo: {channel.upper()}
Estilo requerido: {channel_spec['style']}
Límite de caracteres: {channel_spec['max_chars']}
Formato: {channel_spec['format']}
{format_note}

Tipo de contenido: {content_desc}
Tono de comunicación: {tone}
{topic_line}

IMPORTANTE:
- Escribe en español latinoamericano natural
- El contenido debe ser auténtico, no genérico
- Adapta el mensaje al cliente ideal definido
- Siempre incluye una llamada a la acción clara
- Si es una propiedad específica, menciona detalles reales (precio, ubicación, características)"""

    video_script_field = ""
    if channel == "tiktok" or format_type == "reel":
        video_script_field = '"video_script": "Guión detallado para video de 30-60 segundos: escena por escena con texto en pantalla y acciones sugeridas",'

    master_prompt = IMAGE_PROMPT_MASTERS.get(content_type, IMAGE_PROMPT_MASTERS["educational"])

    user_prompt = f"""Genera un post de tipo '{content_type}' para {channel.upper()} ({format_type}) sobre este negocio.

Responde en este formato JSON exacto:
{{
  "hook": "Primera frase gancho (máx 15 palabras, debe atrapar la atención inmediatamente)",
  "caption": "Caption completo listo para publicar (respeta el límite de caracteres del canal)",
  "hashtags": ["hashtag1", "hashtag2"],
  "suggested_image_prompt": "Prompt ULTRA-DETALLADO en inglés para fal.ai FLUX. Usa como inspiración este master prompt para el tipo '{content_type}': {master_prompt}. ADAPTA el master al contexto específico de este negocio: incluye el tipo de propiedad/servicio, la ubicación, el cliente ideal, y el canal {channel}. Sé muy específico: sujeto principal, paleta de colores exacta (hexadecimales si aplica), iluminación (golden hour / estudio / natural), composición ({format_style}), estilo fotográfico, mood emocional. Mínimo 80 palabras en inglés.",
  {image_instruction}
  {video_script_field}
  "content_type": "{content_type}",
  "channel": "{channel}",
  "format_type": "{format_type}",
  "estimated_reach": "bajo|medio|alto",
  "best_time_to_post": "Día y hora recomendada para publicar en LATAM"
}}"""

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=2000,
        messages=[{"role": "user", "content": user_prompt}],
        system=system_prompt,
    )

    import json
    text = response.content[0].text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    data = json.loads(text)
    # If property has an image, use it as the post image
    if property_context and property_context.get("cover_image_url") and not data.get("property_image_url"):
        data["property_image_url"] = property_context["cover_image_url"]
    logger.info("content_generated", channel=channel, type=content_type, format=format_type, business=business_context.get("name"))
    return data



async def generate_campaign_brief(business_context: dict, allowed_channels: list[str]) -> dict:
    """
    Lee los datos del negocio y diseña una campaña de marketing mensual completa.
    Retorna: { campaign_name, objective, target_segment, key_messages, content_pillars,
               channels, content_theme, tone, highlight }
    """
    from datetime import datetime
    import json
    current_month = datetime.now().strftime("%B %Y")

    system_prompt = (
        "Eres un Director de Marketing Digital especialista en bienes raíces LATAM. "
        "Tu trabajo es analizar los datos de un negocio y diseñar campañas de marketing mensual "
        "que generen leads reales, awareness de marca y cierres de venta."
    )

    user_prompt = f"""Analiza este negocio y diseña una campaña de marketing mensual completa para {current_month}.

DATOS DEL NEGOCIO:
- Nombre: {business_context.get('name', '')}
- Industria: {business_context.get('industry', 'Bienes raíces')}
- Producto/Servicio: {business_context.get('product_description', '')}
- Cliente ideal: {business_context.get('target_customer', '')}
- Propuesta de valor: {business_context.get('value_proposition', '')}
- Precios: {business_context.get('pricing_info', '')}

CANALES DISPONIBLES: {allowed_channels}

Diseña la campaña óptima. Responde SOLO con JSON válido:
{{
  "campaign_name": "nombre creativo y memorable para la campaña (máx 6 palabras en español)",
  "objective": "objetivo medible del mes en 1 línea concreta",
  "target_segment": "descripción precisa del segmento prioritario",
  "key_messages": ["mensaje clave 1", "mensaje clave 2", "mensaje clave 3"],
  "content_pillars": ["pilar de contenido 1", "pilar 2", "pilar 3"],
  "channels": ["canal1", "canal2"],
  "content_theme": "mixed|properties|informativo|marca|testimonios|tendencias|promocional",
  "tone": "tono recomendado en 4-5 palabras",
  "highlight": "un insight poderoso sobre esta audiencia en 1 línea"
}}"""

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=700,
        messages=[{"role": "user", "content": user_prompt}],
        system=system_prompt,
    )

    text = response.content[0].text.strip()
    if "```" in text:
        text = text.split("```json")[-1].split("```")[0].strip() if "```json" in text else text.split("```")[1].split("```")[0].strip()

    brief = json.loads(text)
    # Ensure channels are within the allowed set
    brief["channels"] = [c for c in brief.get("channels", []) if c in allowed_channels] or allowed_channels[:2]
    logger.info("campaign_brief_generated", campaign=brief.get("campaign_name"), theme=brief.get("content_theme"))
    return brief


async def generate_image_prompt_from_post(
    caption: str,
    hook: str | None,
    hashtags: list[str],
    content_type: str,
    channel: str,
    format_type: str,
    business_context: dict,
) -> str:
    """
    Lee el contenido real del post (caption, hook, hashtags) y genera
    un prompt de imagen ultra-detallado y contextualizado para fal.ai.
    El prompt refleja exactamente el mensaje del post.
    """
    master_prompt = IMAGE_PROMPT_MASTERS.get(content_type, IMAGE_PROMPT_MASTERS["educational"])
    format_style = FORMAT_IMAGE_STYLE.get(format_type, FORMAT_IMAGE_STYLE["post"])

    post_lines = []
    if hook:
        post_lines.append(f"HOOK: {hook}")
    post_lines.append(f"CAPTION:\n{caption}")
    if hashtags:
        post_lines.append(f"HASHTAGS: {', '.join(hashtags[:6])}")
    post_text = "\n\n".join(post_lines)

    system_prompt = (
        "Eres un director de arte especialista en marketing inmobiliario digital. "
        "Tu trabajo es leer el texto de un post y crear prompts de imagen ultra-detallados "
        "que produzcan imágenes perfectamente alineadas con el mensaje del post. "
        "Tus prompts son precisos, visuales y siempre en inglés profesional."
    )

    user_prompt = f"""Lee este post de {channel.upper()} y crea un prompt de imagen que lo ilustre visualmente.

CONTENIDO DEL POST:
{post_text}

NEGOCIO:
- Nombre: {business_context.get('name', '')}
- Sector: {business_context.get('industry', 'Bienes raíces')}
- Cliente ideal: {business_context.get('target_customer', '')}

INSPIRACIÓN VISUAL (master prompt para tipo '{content_type}'):
{master_prompt}

INSTRUCCIONES:
- La imagen debe ILUSTRAR y REFORZAR visualmente el mensaje del post
- Composición: {format_style}
- Adapta la inspiración visual al contexto concreto del post (no la copies literalmente)
- Especifica: sujeto principal, paleta de colores exacta, iluminación, plano fotográfico, estilo, mood emocional
- Si el post menciona una ubicación, propiedad o característica concreta → inclúyela en la imagen
- Escribe en inglés, mínimo 70 palabras
- Termina con: "No text, no logos, no watermarks. {format_style}."
- Responde SOLO con el prompt de imagen, sin explicaciones"""

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=600,
        messages=[{"role": "user", "content": user_prompt}],
        system=system_prompt,
    )

    prompt = response.content[0].text.strip()
    logger.info("image_prompt_generated_from_post", channel=channel, type=content_type, words=len(prompt.split()))
    return prompt


async def generate_content_calendar(
    business_context: dict,
    days: int = 7,
    posts_per_day: int = 1,
    channels: list[str] | None = None,
    content_theme: str = "mixed",
    properties: list[dict] | None = None,
) -> list[dict]:
    """
    Genera un calendario de contenido completo para N días.
    Soporta temas: mixed, properties, informativo, marca, testimonios, tendencias, promocional.
    """
    import asyncio
    from datetime import datetime, timedelta

    if channels is None:
        channels = ["instagram", "facebook"]

    distribution = THEME_DISTRIBUTIONS.get(content_theme, THEME_DISTRIBUTIONS["mixed"])
    format_rotation = ["post", "post", "story", "post", "post", "story", "post"]
    base_date = datetime.now()

    # Construir lista de tareas con su metadata
    tasks_meta = []
    prop_index = 0
    for day in range(days):
        for ch in channels:
            content_type = distribution[day % len(distribution)]
            format_type = format_rotation[day % len(format_rotation)]
            post_date = base_date + timedelta(days=day)
            # Ciclar propiedades cuando el tipo es property_listing
            prop_ctx = None
            if content_type == "property_listing" and properties:
                prop_ctx = properties[prop_index % len(properties)]
                prop_index += 1
            tasks_meta.append((day, ch, content_type, format_type, post_date, prop_ctx))

    BATCH_SIZE = 5
    results: list[dict] = []
    for i in range(0, len(tasks_meta), BATCH_SIZE):
        batch = tasks_meta[i:i + BATCH_SIZE]
        batch_results = await asyncio.gather(*[
            generate_post(
                business_context=business_context,
                channel=ch,
                content_type=ct,
                format_type=ft,
                property_context=prop_ctx,
            )
            for _, ch, ct, ft, _, prop_ctx in batch
        ], return_exceptions=True)
        for item in batch_results:
            if isinstance(item, Exception):
                logger.warning("calendar_post_failed", error=str(item))
                results.append({"hook": "", "caption": "[Error al generar]", "hashtags": [], "channel": "instagram"})
            else:
                results.append(item)
        if i + BATCH_SIZE < len(tasks_meta):
            await asyncio.sleep(1)

    calendar = []
    for (day, ch, ct, ft, post_date, _), post in zip(tasks_meta, results):
        post["scheduled_date"] = post_date.strftime("%Y-%m-%d")
        post["day_number"] = day + 1
        post["format_type"] = ft
        calendar.append(post)

    logger.info("calendar_generated", days=days, channels=channels, theme=content_theme, total_posts=len(calendar))
    return calendar
