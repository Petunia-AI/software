"""
Presentations API — Generate AI presentations from meeting transcripts using Claude.

Endpoints:
  GET    /presentations               — List presentations (most recent first)
  POST   /presentations               — Create + generate presentation from transcript
  GET    /presentations/{id}          — Get full presentation detail (includes HTML)
  DELETE /presentations/{id}          — Delete presentation
  POST   /presentations/{id}/regenerate — Regenerate with (optionally different) style
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional

import structlog
from anthropic import AsyncAnthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.business import Business
from app.models.presentation import Presentation
from app.models.user import User

logger = structlog.get_logger()
router = APIRouter(prefix="/presentations", tags=["presentations"])

# ── Style configurations ───────────────────────────────────────────────────────

STYLE_CONFIGS: dict[str, dict] = {
    "profesional": {
        "primary": "#7C3AED",
        "secondary": "#5B21B6",
        "accent": "#C4B5FD",
        "bg": "#FFFFFF",
        "desc": "Elegante con gradientes violeta y púrpura. Tipografía moderna y limpia.",
    },
    "creativo": {
        "primary": "#EC4899",
        "secondary": "#8B5CF6",
        "accent": "#F59E0B",
        "bg": "#FAFAFA",
        "desc": "Vibrante y dinámico. Colores llamativos, formas modernas.",
    },
    "minimalista": {
        "primary": "#111827",
        "secondary": "#374151",
        "accent": "#6B7280",
        "bg": "#FFFFFF",
        "desc": "Limpio y sofisticado. Mucho espacio en blanco, tipografía grande.",
    },
    "corporativo": {
        "primary": "#1E3A5F",
        "secondary": "#2563EB",
        "accent": "#93C5FD",
        "bg": "#F8FAFC",
        "desc": "Formal y estructurado. Azul marino, ideal para presentaciones ejecutivas.",
    },
}

# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_business(db: AsyncSession, user: User) -> Business:
    r = await db.execute(select(Business).where(Business.id == user.business_id))
    biz = r.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return biz


async def _get_presentation(db: AsyncSession, pres_id: str, business_id: str) -> Presentation:
    r = await db.execute(
        select(Presentation).where(
            Presentation.id == pres_id,
            Presentation.business_id == business_id,
        )
    )
    p = r.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Presentación no encontrada")
    return p


async def _generate_html(
    title: str,
    transcript: str,
    style: str,
    business_name: str,
) -> tuple[str, int]:
    """Call Claude to generate a beautiful HTML presentation. Returns (html, slide_count)."""

    cfg = STYLE_CONFIGS.get(style, STYLE_CONFIGS["profesional"])
    today = datetime.now(timezone.utc).strftime("%d de %B de %Y")

    # Truncate very long transcripts to avoid token limits
    if len(transcript) > 14000:
        transcript = transcript[:14000] + "\n\n[... transcripción truncada ...]"

    prompt = f"""Eres un diseñador experto en presentaciones ejecutivas. Genera una presentación HTML espectacular y lista para usar.

DATOS DE LA PRESENTACIÓN:
- Título: {title}
- Empresa: {business_name}
- Fecha: {today}
- Estilo: {style} — {cfg["desc"]}
- Color primario: {cfg["primary"]} | Secundario: {cfg["secondary"]} | Acento: {cfg["accent"]}

TRANSCRIPCIÓN DE LA REUNIÓN:
{transcript}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERA UN DOCUMENTO HTML COMPLETO con estas especificaciones exactas:

## ESTRUCTURA HTML:
```
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[título]</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    /* ... todo el CSS aquí ... */
  </style>
</head>
<body>
  <div class="slide"> ... </div>
  <div class="slide"> ... </div>
  ...
</body>
</html>
```

## CSS OBLIGATORIO:
```css
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ background: #F1F5F9; font-family: 'Inter', sans-serif; }}
.slide {{
  width: 1280px;
  height: 720px;
  margin: 24px auto;
  overflow: hidden;
  position: relative;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
}}
@media print {{
  body {{ background: white; }}
  .slide {{
    width: 100%; height: 100vh;
    margin: 0; border-radius: 0;
    box-shadow: none; page-break-after: always;
  }}
}}
```

## DISEÑO POR TIPO DE SLIDE:

### SLIDE 1 — PORTADA:
- Fondo: gradiente espectacular con {cfg["primary"]}
- Título: 64px, blanco, centrado, font-weight 800
- Subtítulo: nombre empresa + fecha en color semi-transparente
- Elemento decorativo: círculos o formas geométricas semitransparentes en el fondo

### SLIDES DE CONTENIDO (estándar):
- Header: banda de 110px con fondo {cfg["primary"]}, título del slide en blanco 28px font-weight 700
- Body: fondo {cfg["bg"]}, padding 48px 60px
- Bullets: puntos con color {cfg["primary"]}, texto 18px, line-height 2
- Máximo 5-6 puntos por slide, nunca párrafos largos

### SLIDE DE MÉTRICAS (si hay datos numéricos en la transcripción):
- Grid de 3-4 tarjetas con: número grande (72px bold, color {cfg["primary"]}), etiqueta descriptiva
- Fondo de cada tarjeta: gradiente suave

### SLIDE DE COMPROMISOS/ACUERDOS:
- Lista con iconos ✓ o ▸ en verde
- Fondo oscuro tipo pizarrón o gradiente oscuro con texto claro

### SLIDE FINAL — PRÓXIMOS PASOS Y CIERRE:
- Fondo oscuro con gradiente
- Lista de acciones con fechas si las hay
- "Gracias" o "¿Preguntas?" al final

## ESTRUCTURA DE SLIDES (8-12 slides según el contenido):
1. Portada con título y subtítulo
2. Agenda / Temas tratados hoy
3-8. Contenido principal extraído de la transcripción (un tema importante por slide)
9. Compromisos y acuerdos clave
10. Próximos pasos
11. (Opcional) Datos/métricas si hay números importantes
12. Cierre / Gracias

## REGLAS DE ORO:
- Texto MÍNIMO por slide — solo puntos clave, nunca párrafos
- Extrae y destaca DATOS NUMÉRICOS (fechas, porcentajes, montos, plazos)
- TODO EN ESPAÑOL siempre, sin importar el idioma de la transcripción
- Sin JavaScript — HTML y CSS puros únicamente
- El HTML debe ser completamente auto-contenido
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Responde ÚNICAMENTE con el HTML completo. Sin explicaciones. Sin markdown. Sin ``` code blocks.
Comienza directamente con <!DOCTYPE html> y termina con </html>."""

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}],
    )

    html = message.content[0].text.strip()

    # Strip markdown code fences if Claude added them
    if html.startswith("```"):
        html = re.sub(r"^```[a-z]*\n?", "", html)
        html = re.sub(r"\n?```$", "", html)
        html = html.strip()

    # Count slides
    slide_count = len(re.findall(r'class=["\']slide["\']', html))

    return html, slide_count


# ── Schemas ────────────────────────────────────────────────────────────────────

class CreatePresentationRequest(BaseModel):
    title: str
    transcript_text: str
    style: str = "profesional"


class RegenerateRequest(BaseModel):
    style: Optional[str] = None


class PresentationListItem(BaseModel):
    id: str
    title: str
    style: str
    slide_count: int
    created_at: datetime
    model_config = {"from_attributes": True}


class PresentationOut(BaseModel):
    id: str
    business_id: str
    title: str
    transcript_text: Optional[str]
    style: str
    presentation_html: Optional[str]
    slide_count: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[PresentationListItem])
async def list_presentations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(
        select(Presentation)
        .where(Presentation.business_id == biz.id)
        .order_by(Presentation.created_at.desc())
    )
    return r.scalars().all()


@router.post("", response_model=PresentationOut)
async def create_presentation(
    payload: CreatePresentationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)

    if not payload.transcript_text or len(payload.transcript_text.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="La transcripción debe tener al menos 50 caracteres.",
        )
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY no configurada.")

    style = payload.style if payload.style in STYLE_CONFIGS else "profesional"

    logger.info("generating_presentation", title=payload.title, style=style, business=biz.id)

    html, slide_count = await _generate_html(
        title=payload.title,
        transcript=payload.transcript_text,
        style=style,
        business_name=biz.name or "Empresa",
    )

    pres = Presentation(
        business_id=biz.id,
        title=payload.title,
        transcript_text=payload.transcript_text,
        style=style,
        presentation_html=html,
        slide_count=slide_count,
    )
    db.add(pres)
    await db.commit()
    await db.refresh(pres)

    logger.info("presentation_created", id=pres.id, slides=slide_count)
    return pres


@router.get("/{presentation_id}", response_model=PresentationOut)
async def get_presentation(
    presentation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    return await _get_presentation(db, presentation_id, biz.id)


@router.delete("/{presentation_id}", status_code=204)
async def delete_presentation(
    presentation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    pres = await _get_presentation(db, presentation_id, biz.id)
    await db.delete(pres)
    await db.commit()


@router.post("/{presentation_id}/regenerate", response_model=PresentationOut)
async def regenerate_presentation(
    presentation_id: str,
    payload: RegenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    pres = await _get_presentation(db, presentation_id, biz.id)

    if not pres.transcript_text:
        raise HTTPException(
            status_code=400, detail="No hay transcripción guardada para regenerar."
        )

    style = payload.style if payload.style in STYLE_CONFIGS else pres.style

    html, slide_count = await _generate_html(
        title=pres.title,
        transcript=pres.transcript_text,
        style=style,
        business_name=biz.name or "Empresa",
    )

    pres.presentation_html = html
    pres.slide_count = slide_count
    pres.style = style
    await db.commit()
    await db.refresh(pres)

    logger.info("presentation_regenerated", id=pres.id, slides=slide_count, style=style)
    return pres
