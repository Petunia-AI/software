"""
Meetings API Router — Google Meet, Zoom, AI Summary & Presentation

Endpoints:
  GET  /meetings/calendar-accounts          — Listar cuentas de calendario conectadas
  GET  /meetings/calendar/connect-google    — Iniciar OAuth Google Calendar
  GET  /meetings/oauth/google/callback      — Callback OAuth Google
  GET  /meetings/calendar/connect-zoom      — Iniciar OAuth Zoom
  GET  /meetings/oauth/zoom/callback        — Callback OAuth Zoom
  DELETE /meetings/calendar-accounts/{id}  — Desconectar cuenta
  GET  /meetings                            — Listar reuniones
  POST /meetings                            — Crear reunión (Google Meet o Zoom)
  GET  /meetings/{id}                       — Detalle de reunión
  PUT  /meetings/{id}                       — Actualizar reunión
  DELETE /meetings/{id}                     — Eliminar reunión
  PATCH /meetings/{id}/status               — Cambiar status (scheduled/completed/cancelled)
  POST /meetings/{id}/transcript            — Guardar transcript
  POST /meetings/{id}/generate-summary      — Gemini genera resumen
  POST /meetings/{id}/generate-presentation — Claude genera presentación HTML + email
"""
from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
import structlog
from anthropic import AsyncAnthropic
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.business import Business
from app.models.meeting import CalendarAccount, Meeting
from app.models.user import User
from app.services.crm_email_service import decrypt_secret, encrypt_secret

logger = structlog.get_logger()
router = APIRouter(prefix="/meetings", tags=["meetings"])

# ── Constants ─────────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_SCOPES = " ".join([
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "openid",
])
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"

ZOOM_AUTH_URL = "https://zoom.us/oauth/authorize"
ZOOM_TOKEN_URL = "https://zoom.us/oauth/token"
ZOOM_API = "https://api.zoom.us/v2"

# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_business(db: AsyncSession, user: User) -> Business:
    r = await db.execute(select(Business).where(Business.id == user.business_id))
    biz = r.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return biz


async def _get_meeting(db: AsyncSession, meeting_id: str, business_id: str) -> Meeting:
    r = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.business_id == business_id)
    )
    m = r.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    return m


async def _get_calendar_account(db: AsyncSession, account_id: str, business_id: str) -> CalendarAccount:
    r = await db.execute(
        select(CalendarAccount).where(
            CalendarAccount.id == account_id,
            CalendarAccount.business_id == business_id,
        )
    )
    acc = r.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta de calendario no encontrada")
    return acc


async def _refresh_google_calendar_token(acc: CalendarAccount, db: AsyncSession) -> str:
    """Refresh Google token if needed and return valid access_token."""
    access = decrypt_secret(acc.access_token_enc)
    if acc.token_expires_at:
        expires = acc.token_expires_at
        if not expires.tzinfo:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires - datetime.now(timezone.utc) < timedelta(minutes=5):
            refresh = decrypt_secret(acc.refresh_token_enc)
            async with httpx.AsyncClient() as client:
                resp = await client.post(GOOGLE_TOKEN_URL, data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "refresh_token": refresh,
                    "grant_type": "refresh_token",
                })
                resp.raise_for_status()
                tokens = resp.json()
            access = tokens["access_token"]
            acc.access_token_enc = encrypt_secret(access)
            acc.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
            await db.commit()
    return access


async def _refresh_zoom_token(acc: CalendarAccount, db: AsyncSession) -> str:
    """Refresh Zoom token if needed and return valid access_token."""
    access = decrypt_secret(acc.access_token_enc)
    if acc.token_expires_at:
        expires = acc.token_expires_at
        if not expires.tzinfo:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires - datetime.now(timezone.utc) < timedelta(minutes=5):
            refresh = decrypt_secret(acc.refresh_token_enc)
            import base64
            creds = base64.b64encode(f"{settings.zoom_client_id}:{settings.zoom_client_secret}".encode()).decode()
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    ZOOM_TOKEN_URL,
                    params={"grant_type": "refresh_token", "refresh_token": refresh},
                    headers={"Authorization": f"Basic {creds}"},
                )
                resp.raise_for_status()
                tokens = resp.json()
            access = tokens["access_token"]
            acc.access_token_enc = encrypt_secret(access)
            acc.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
            await db.commit()
    return access


# ── Schemas ───────────────────────────────────────────────────────────────────

class CalendarAccountOut(BaseModel):
    id: str
    provider: str
    email_or_user: Optional[str]
    display_name: Optional[str]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class CreateMeetingRequest(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    provider: str = "google"  # google | zoom | manual
    calendar_account_id: Optional[str] = None
    lead_id: Optional[str] = None
    attendees: list[dict] = []  # [{email, name}]
    meeting_url: Optional[str] = None  # for manual


class UpdateMeetingRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    meeting_url: Optional[str] = None


class TranscriptRequest(BaseModel):
    transcript_text: str


class MeetingOut(BaseModel):
    id: str
    business_id: str
    lead_id: Optional[str]
    calendar_account_id: Optional[str]
    title: str
    description: Optional[str]
    provider: str
    status: str
    meeting_url: Optional[str]
    meeting_id_ext: Optional[str]
    start_time: datetime
    end_time: datetime
    attendees_json: Optional[str]
    transcript_text: Optional[str]
    summary_text: Optional[str]
    presentation_html: Optional[str]
    follow_up_email_html: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Calendar OAuth — Google ───────────────────────────────────────────────────

@router.get("/calendar/connect-google")
async def connect_google_calendar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google OAuth no configurado. Agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.")
    state = secrets.token_urlsafe(24)
    redirect_uri = f"{settings.backend_url}/api/meetings/oauth/google/callback"
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_CALENDAR_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": f"{current_user.id}:{state}",
    }
    return {"auth_url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}


@router.get("/oauth/google/callback")
async def google_calendar_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    user_id = state.split(":")[0]
    redirect_uri = f"{settings.backend_url}/api/meetings/oauth/google/callback"
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        if not resp.is_success:
            logger.error("google_calendar_token_error", body=resp.text)
            return RedirectResponse(f"{settings.frontend_url}/meetings?error=google_oauth")
        tokens = resp.json()

        # Get user profile
        profile_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        profile = profile_resp.json()

    # Find business for this user
    from app.models.user import User as UserModel
    r = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = r.scalar_one_or_none()
    if not user:
        return RedirectResponse(f"{settings.frontend_url}/meetings?error=user_not_found")

    # Upsert calendar account
    r = await db.execute(
        select(CalendarAccount).where(
            CalendarAccount.business_id == user.business_id,
            CalendarAccount.provider == "google",
            CalendarAccount.email_or_user == profile.get("email"),
        )
    )
    acc = r.scalar_one_or_none()
    if not acc:
        acc = CalendarAccount(business_id=user.business_id, provider="google")
        db.add(acc)

    acc.email_or_user = profile.get("email")
    acc.display_name = profile.get("name") or profile.get("email")
    acc.access_token_enc = encrypt_secret(tokens["access_token"])
    acc.refresh_token_enc = encrypt_secret(tokens.get("refresh_token", ""))
    acc.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
    acc.is_active = True
    await db.commit()

    return RedirectResponse(f"{settings.frontend_url}/meetings?connected=google")


# ── Calendar OAuth — Zoom ─────────────────────────────────────────────────────

@router.get("/calendar/connect-zoom")
async def connect_zoom(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.zoom_client_id:
        raise HTTPException(status_code=503, detail="Zoom OAuth no configurado. Agrega ZOOM_CLIENT_ID y ZOOM_CLIENT_SECRET.")
    state = secrets.token_urlsafe(24)
    redirect_uri = f"{settings.backend_url}/api/meetings/oauth/zoom/callback"
    params = {
        "client_id": settings.zoom_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "state": f"{current_user.id}:{state}",
    }
    return {"auth_url": f"{ZOOM_AUTH_URL}?{urlencode(params)}"}


@router.get("/oauth/zoom/callback")
async def zoom_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    user_id = state.split(":")[0]
    redirect_uri = f"{settings.backend_url}/api/meetings/oauth/zoom/callback"
    import base64
    creds = base64.b64encode(f"{settings.zoom_client_id}:{settings.zoom_client_secret}".encode()).decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            ZOOM_TOKEN_URL,
            params={"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri},
            headers={"Authorization": f"Basic {creds}"},
        )
        if not resp.is_success:
            return RedirectResponse(f"{settings.frontend_url}/meetings?error=zoom_oauth")
        tokens = resp.json()

        # Get Zoom profile
        profile_resp = await client.get(
            f"{ZOOM_API}/users/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        profile = profile_resp.json()

    from app.models.user import User as UserModel
    r = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = r.scalar_one_or_none()
    if not user:
        return RedirectResponse(f"{settings.frontend_url}/meetings?error=user_not_found")

    # Upsert
    r = await db.execute(
        select(CalendarAccount).where(
            CalendarAccount.business_id == user.business_id,
            CalendarAccount.provider == "zoom",
        )
    )
    acc = r.scalar_one_or_none()
    if not acc:
        acc = CalendarAccount(business_id=user.business_id, provider="zoom")
        db.add(acc)

    acc.email_or_user = profile.get("email")
    acc.display_name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip() or profile.get("email")
    acc.zoom_account_id = profile.get("id")
    acc.access_token_enc = encrypt_secret(tokens["access_token"])
    acc.refresh_token_enc = encrypt_secret(tokens.get("refresh_token", ""))
    acc.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
    acc.is_active = True
    await db.commit()

    return RedirectResponse(f"{settings.frontend_url}/meetings?connected=zoom")


# ── Calendar Accounts CRUD ────────────────────────────────────────────────────

@router.get("/calendar-accounts", response_model=list[CalendarAccountOut])
async def list_calendar_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(
        select(CalendarAccount).where(CalendarAccount.business_id == biz.id).order_by(CalendarAccount.created_at)
    )
    return r.scalars().all()


@router.delete("/calendar-accounts/{account_id}", status_code=204)
async def disconnect_calendar_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    acc = await _get_calendar_account(db, account_id, biz.id)
    await db.delete(acc)
    await db.commit()


# ── Meetings CRUD ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[MeetingOut])
async def list_meetings(
    status: Optional[str] = Query(None),
    lead_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    q = select(Meeting).where(Meeting.business_id == biz.id)
    if status:
        q = q.where(Meeting.status == status)
    if lead_id:
        q = q.where(Meeting.lead_id == lead_id)
    q = q.order_by(Meeting.start_time.desc())
    r = await db.execute(q)
    return r.scalars().all()


@router.post("", response_model=MeetingOut)
async def create_meeting(
    payload: CreateMeetingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    meeting_url = payload.meeting_url
    meeting_id_ext = None
    calendar_event_id = None

    if payload.provider == "google" and payload.calendar_account_id:
        # Create Google Calendar event with Meet link
        acc = await _get_calendar_account(db, payload.calendar_account_id, biz.id)
        token = await _refresh_google_calendar_token(acc, db)
        event_body = {
            "summary": payload.title,
            "description": payload.description or "",
            "start": {"dateTime": payload.start_time.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": payload.end_time.isoformat(), "timeZone": "UTC"},
            "attendees": [{"email": a["email"]} for a in payload.attendees if a.get("email")],
            "conferenceData": {
                "createRequest": {
                    "requestId": secrets.token_hex(8),
                    "conferenceSolutionKey": {"type": "hangoutsMeet"},
                }
            },
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
                json=event_body,
                headers={"Authorization": f"Bearer {token}"},
            )
            if not resp.is_success:
                logger.error("google_create_event_error", body=resp.text)
                raise HTTPException(status_code=502, detail=f"Error al crear evento en Google Calendar: {resp.text}")
            event = resp.json()
        meeting_url = event.get("conferenceData", {}).get("entryPoints", [{}])[0].get("uri") or event.get("htmlLink")
        calendar_event_id = event.get("id")
        meeting_id_ext = calendar_event_id

    elif payload.provider == "zoom" and payload.calendar_account_id:
        # Create Zoom meeting
        acc = await _get_calendar_account(db, payload.calendar_account_id, biz.id)
        token = await _refresh_zoom_token(acc, db)
        zoom_body = {
            "topic": payload.title,
            "agenda": payload.description or "",
            "type": 2,  # Scheduled meeting
            "start_time": payload.start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "duration": int((payload.end_time - payload.start_time).total_seconds() / 60),
            "settings": {"auto_recording": "none"},
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{ZOOM_API}/users/me/meetings",
                json=zoom_body,
                headers={"Authorization": f"Bearer {token}"},
            )
            if not resp.is_success:
                raise HTTPException(status_code=502, detail=f"Error al crear reunión en Zoom: {resp.text}")
            zm = resp.json()
        meeting_url = zm.get("join_url")
        meeting_id_ext = str(zm.get("id"))

    meeting = Meeting(
        business_id=biz.id,
        lead_id=payload.lead_id,
        calendar_account_id=payload.calendar_account_id,
        title=payload.title,
        description=payload.description,
        provider=payload.provider,
        status="scheduled",
        meeting_url=meeting_url,
        meeting_id_ext=meeting_id_ext,
        calendar_event_id=calendar_event_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        attendees_json=json.dumps(payload.attendees) if payload.attendees else None,
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    return meeting


@router.get("/{meeting_id}", response_model=MeetingOut)
async def get_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    return await _get_meeting(db, meeting_id, biz.id)


@router.put("/{meeting_id}", response_model=MeetingOut)
async def update_meeting(
    meeting_id: str,
    payload: UpdateMeetingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    meeting = await _get_meeting(db, meeting_id, biz.id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(meeting, field, value)
    await db.commit()
    await db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    meeting = await _get_meeting(db, meeting_id, biz.id)
    await db.delete(meeting)
    await db.commit()


@router.patch("/{meeting_id}/status", response_model=MeetingOut)
async def update_meeting_status(
    meeting_id: str,
    status: str = Query(..., pattern="^(scheduled|completed|cancelled)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    meeting = await _get_meeting(db, meeting_id, biz.id)
    meeting.status = status
    await db.commit()
    await db.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/transcript", response_model=MeetingOut)
async def save_transcript(
    meeting_id: str,
    payload: TranscriptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    meeting = await _get_meeting(db, meeting_id, biz.id)
    meeting.transcript_text = payload.transcript_text
    # Clear old AI results when transcript changes
    meeting.summary_text = None
    meeting.presentation_html = None
    meeting.follow_up_email_html = None
    await db.commit()
    await db.refresh(meeting)
    return meeting


# ── AI: Gemini Summary ────────────────────────────────────────────────────────

@router.post("/{meeting_id}/generate-summary", response_model=MeetingOut)
async def generate_summary(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    meeting = await _get_meeting(db, meeting_id, biz.id)

    if not meeting.transcript_text:
        raise HTTPException(status_code=400, detail="Primero agrega el transcript de la reunión")

    if not settings.gemini_api_key:
        # Fallback: use Claude to summarize if no Gemini key
        logger.info("gemini_key_missing_using_claude_fallback")
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await client.messages.create(
            model=settings.claude_model,
            max_tokens=2000,
            temperature=0.3,
            system="""Eres un asistente experto en resumir reuniones de negocios.
Extrae los puntos más importantes de la transcripción y devuelve un resumen estructurado en español con:
- **Resumen ejecutivo** (2-3 oraciones)
- **Puntos clave discutidos** (lista)
- **Acuerdos y compromisos** (lista)
- **Próximos pasos** (lista con responsables si se mencionan)
- **Temas pendientes** (lista)""",
            messages=[{"role": "user", "content": f"Transcript de la reunión '{meeting.title}':\n\n{meeting.transcript_text}"}],
        )
        summary = response.content[0].text
    else:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""Analiza esta transcripción de reunión y genera un resumen ejecutivo estructurado en español.

Reunión: {meeting.title}
Fecha: {meeting.start_time.strftime('%d/%m/%Y %H:%M') if meeting.start_time else 'N/A'}

TRANSCRIPT:
{meeting.transcript_text}

Devuelve el resumen con estas secciones:
## Resumen Ejecutivo
(2-3 oraciones que capturen la esencia de la reunión)

## Puntos Clave Discutidos
(lista de los temas más importantes)

## Acuerdos y Compromisos
(lista de lo que se acordó hacer)

## Próximos Pasos
(acciones concretas con responsables y fechas si se mencionaron)

## Temas Pendientes
(asuntos que quedaron sin resolver)"""
        response = model.generate_content(prompt)
        summary = response.text

    meeting.summary_text = summary
    await db.commit()
    await db.refresh(meeting)
    return meeting


# ── AI: Claude Presentation + Follow-up Email ─────────────────────────────────

@router.post("/{meeting_id}/generate-presentation", response_model=MeetingOut)
async def generate_presentation(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    meeting = await _get_meeting(db, meeting_id, biz.id)

    if not meeting.summary_text and not meeting.transcript_text:
        raise HTTPException(status_code=400, detail="Primero genera el resumen de la reunión")

    content_source = meeting.summary_text or meeting.transcript_text

    # Build context
    biz_ctx = "\n".join(filter(None, [
        f"Empresa: {biz.name}" if biz.name else "",
        f"Industria: {getattr(biz, 'industry', None)}" if getattr(biz, "industry", None) else "",
        f"Descripción: {getattr(biz, 'description', None)}" if getattr(biz, "description", None) else "",
    ]))

    attendees = []
    if meeting.attendees_json:
        try:
            attendees = json.loads(meeting.attendees_json)
        except Exception:
            pass
    attendees_str = ", ".join(a.get("email", "") for a in attendees) if attendees else "participantes de la reunión"

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    # ── Generate HTML Presentation ──
    pres_prompt = f"""Crea una presentación ejecutiva profesional en formato HTML para compartir con el cliente.

Empresa anfitriona: {biz_ctx or biz.name}
Reunión: {meeting.title}
Fecha: {meeting.start_time.strftime('%d de %B de %Y') if meeting.start_time else 'N/A'}
Asistentes: {attendees_str}

RESUMEN DE LA REUNIÓN:
{content_source}

Genera un HTML completo y elegante (con estilos CSS inline) que incluya:
1. Encabezado con el nombre de la empresa, título de la reunión y fecha
2. Resumen ejecutivo en destacado
3. Secciones con los puntos clave (con íconos o bullets estilizados)
4. Acuerdos y compromisos
5. Próximos pasos (con formato de checklist visual)
6. Pie de página profesional

Usa una paleta de colores profesional (azul/gris corporativo o violeta).
El HTML debe verse bien al abrirlo en un navegador o convertirlo a PDF.
Devuelve SOLO el HTML, sin markdown ni explicaciones."""

    pres_response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=4000,
        temperature=0.4,
        system="Eres un diseñador de presentaciones ejecutivas especializado en documentos corporativos para equipos de ventas B2B en LATAM.",
        messages=[{"role": "user", "content": pres_prompt}],
    )
    presentation_html = pres_response.content[0].text.strip()
    # Strip markdown code fences if Claude wraps in ```html
    if presentation_html.startswith("```"):
        lines = presentation_html.split("\n")
        presentation_html = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    # ── Generate Follow-up Email ──
    email_prompt = f"""Redacta un email de seguimiento profesional y cálido para enviar al cliente después de la reunión.

Empresa: {biz.name}
Reunión: {meeting.title}
Fecha: {meeting.start_time.strftime('%d de %B de %Y') if meeting.start_time else 'N/A'}

RESUMEN DE LA REUNIÓN:
{content_source}

El email debe:
- Agradecer por el tiempo y la reunión
- Resumir brevemente los puntos más importantes acordados
- Confirmar los próximos pasos con fechas/responsables si los hay
- Invitar a contactar para cualquier duda
- Tener un tono profesional pero cercano (LATAM)

Devuelve el email como HTML limpio y elegante (sin <html>/<head>/<body> externos).
Incluye asunto en la primera línea como: ASUNTO: [el asunto del email]
Luego el cuerpo HTML."""

    email_response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=2000,
        temperature=0.5,
        system="Eres un experto en comunicación corporativa B2B para LATAM.",
        messages=[{"role": "user", "content": email_prompt}],
    )
    follow_up_raw = email_response.content[0].text.strip()
    # Extract subject if present
    if follow_up_raw.upper().startswith("ASUNTO:"):
        lines = follow_up_raw.split("\n", 1)
        follow_up_email_html = lines[1].strip() if len(lines) > 1 else follow_up_raw
    else:
        follow_up_email_html = follow_up_raw

    meeting.presentation_html = presentation_html
    meeting.follow_up_email_html = follow_up_email_html
    meeting.status = "completed"
    await db.commit()
    await db.refresh(meeting)
    return meeting
