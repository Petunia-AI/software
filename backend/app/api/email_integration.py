"""
Email CRM API Router
Endpoints:
  POST /email/accounts/connect-imap          — Conectar cuenta IMAP/SMTP
  GET  /email/accounts/connect-gmail         — Iniciar OAuth Gmail
  GET  /email/oauth/gmail/callback           — Callback OAuth Gmail
  GET  /email/accounts/connect-outlook       — Iniciar OAuth Outlook
  GET  /email/oauth/outlook/callback         — Callback OAuth Outlook
  GET  /email/accounts                       — Listar cuentas conectadas
  DELETE /email/accounts/{account_id}        — Desconectar cuenta
  POST /email/accounts/{account_id}/sync     — Sincronizar bandeja
  GET  /email/inbox                          — Bandeja unificada
  GET  /email/leads/{lead_id}                — Emails de un lead
  POST /email/send                           — Enviar email
  GET  /email/templates                      — Listar plantillas
  POST /email/templates                      — Crear plantilla
  PUT  /email/templates/{template_id}        — Editar plantilla
  DELETE /email/templates/{template_id}      — Eliminar plantilla
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from anthropic import AsyncAnthropic
from app.api.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models.business import Business
from app.models.email_account import Email, EmailAccount, EmailTemplate
from app.models.lead import Lead
from app.models.user import User
from app.services.crm_email_service import (
    build_gmail_auth_url,
    build_outlook_auth_url,
    decrypt_secret,
    encrypt_secret,
    exchange_gmail_code,
    exchange_outlook_code,
    get_imap_preset,
    gmail_get_profile,
    gmail_send,
    gmail_sync_inbox,
    imap_sync,
    outlook_get_profile,
    outlook_send,
    outlook_sync_inbox,
    refresh_gmail_token,
    refresh_outlook_token,
    smtp_send,
)

logger = structlog.get_logger()
router = APIRouter(prefix="/email", tags=["email"])

# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_business(db: AsyncSession, user: User) -> Business:
    r = await db.execute(select(Business).where(Business.id == user.business_id))
    biz = r.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return biz


async def _get_account(db: AsyncSession, account_id: str, business_id: str) -> EmailAccount:
    r = await db.execute(
        select(EmailAccount).where(
            EmailAccount.id == account_id,
            EmailAccount.business_id == business_id,
        )
    )
    acc = r.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta de email no encontrada")
    return acc


async def _ensure_fresh_token(db: AsyncSession, acc: EmailAccount) -> str:
    """Refresca el token OAuth si está por vencer y retorna el access_token."""
    access = decrypt_secret(acc.access_token_enc)
    if acc.token_expires_at:
        expires = acc.token_expires_at
        if not expires.tzinfo:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires - datetime.now(timezone.utc) < timedelta(minutes=5):
            refresh = decrypt_secret(acc.refresh_token_enc)
            if acc.provider == "gmail":
                tokens = await refresh_gmail_token(refresh)
            else:
                tokens = await refresh_outlook_token(refresh)
            access = tokens["access_token"]
            acc.access_token_enc = encrypt_secret(access)
            acc.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
            await db.commit()
    return access


def _match_lead_to_email(from_email: str, to_emails: list[str], leads: list[Lead]) -> Optional[str]:
    """Intenta asociar un email entrante con un lead por dirección de correo."""
    all_addrs = {from_email.lower()} | {e.lower() for e in to_emails}
    for lead in leads:
        if lead.email and lead.email.lower() in all_addrs:
            return lead.id
    return None


# ── Schemas ───────────────────────────────────────────────────────────────────

class ConnectImapRequest(BaseModel):
    email_address: str
    password: str
    display_name: Optional[str] = None
    imap_host: Optional[str] = None
    imap_port: Optional[int] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_use_tls: bool = True


class SendEmailRequest(BaseModel):
    account_id: str
    to_emails: list[EmailStr]
    cc_emails: list[EmailStr] = []
    subject: str
    body_html: str
    body_text: str = ""
    lead_id: Optional[str] = None


class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body_html: str


class EmailOut(BaseModel):
    id: str
    email_account_id: str
    lead_id: Optional[str]
    direction: str
    from_email: str
    from_name: Optional[str]
    to_emails: list
    cc_emails: list
    subject: Optional[str]
    body_html: Optional[str]
    body_text: Optional[str]
    is_read: bool
    sent_at: Optional[datetime]
    received_at: Optional[datetime]
    created_at: datetime
    model_config = {"from_attributes": True}


class EmailAccountOut(BaseModel):
    id: str
    provider: str
    email_address: str
    display_name: Optional[str]
    is_active: bool
    last_synced_at: Optional[datetime]
    sync_error: Optional[str]
    signature_html: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class UpdateAccountRequest(BaseModel):
    display_name: Optional[str] = None
    signature_html: Optional[str] = None


class EmailTemplateOut(BaseModel):
    id: str
    name: str
    subject: str
    body_html: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Email Accounts ────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=list[EmailAccountOut])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(
        select(EmailAccount)
        .where(EmailAccount.business_id == biz.id)
        .order_by(EmailAccount.created_at)
    )
    return r.scalars().all()


@router.patch("/accounts/{account_id}", response_model=EmailAccountOut)
async def update_account(
    account_id: str,
    body: UpdateAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    acc = await _get_account(db, account_id, biz.id)
    if body.display_name is not None:
        acc.display_name = body.display_name
    if body.signature_html is not None:
        acc.signature_html = body.signature_html
    await db.commit()
    await db.refresh(acc)
    return acc


@router.post("/accounts/connect-imap", response_model=EmailAccountOut)
async def connect_imap(
    body: ConnectImapRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    preset = get_imap_preset(body.email_address)
    imap_host = body.imap_host or preset.get("imap_host")
    imap_port = body.imap_port or preset.get("imap_port", 993)
    smtp_host = body.smtp_host or preset.get("smtp_host")
    smtp_port = body.smtp_port or preset.get("smtp_port", 587)

    if not imap_host or not smtp_host:
        raise HTTPException(
            status_code=422,
            detail="No se detectó preset para este dominio. Proporciona imap_host y smtp_host manualmente.",
        )

    # Verificar credenciales antes de guardar
    try:
        await imap_sync(imap_host, imap_port, body.email_address, body.password, since_days=1)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo conectar al servidor IMAP: {e}")

    acc = EmailAccount(
        business_id=biz.id,
        provider="imap",
        email_address=body.email_address,
        display_name=body.display_name or body.email_address,
        imap_host=imap_host,
        imap_port=imap_port,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_use_tls=body.smtp_use_tls,
        password_enc=encrypt_secret(body.password),
    )
    db.add(acc)
    await db.commit()
    await db.refresh(acc)
    logger.info("email_imap_connected", business_id=biz.id, email=body.email_address)
    return acc


# ── Gmail OAuth ───────────────────────────────────────────────────────────────

@router.get("/accounts/connect-gmail")
async def connect_gmail(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Gmail OAuth no configurado (falta GOOGLE_CLIENT_ID)")
    biz = await _get_business(db, current_user)
    state = f"{biz.id}:{secrets.token_urlsafe(16)}"
    redirect_uri = f"{settings.backend_url}/api/email/oauth/gmail/callback"
    url = build_gmail_auth_url(redirect_uri=redirect_uri, state=state)
    return {"auth_url": url}


@router.get("/oauth/gmail/callback")
async def gmail_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if ":" not in state:
        raise HTTPException(status_code=400, detail="State inválido")
    business_id = state.split(":")[0]

    redirect_uri = f"{settings.backend_url}/api/email/oauth/gmail/callback"
    try:
        tokens = await exchange_gmail_code(code, redirect_uri)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al obtener tokens Gmail: {e}")

    access_token = tokens["access_token"]
    profile = await gmail_get_profile(access_token)
    email_address = profile.get("emailAddress", "")

    # Upsert
    r = await db.execute(
        select(EmailAccount).where(
            EmailAccount.business_id == business_id,
            EmailAccount.email_address == email_address,
            EmailAccount.provider == "gmail",
        )
    )
    acc = r.scalar_one_or_none() or EmailAccount(
        business_id=business_id, provider="gmail", email_address=email_address
    )
    acc.display_name = email_address
    acc.access_token_enc = encrypt_secret(access_token)
    if tokens.get("refresh_token"):
        acc.refresh_token_enc = encrypt_secret(tokens["refresh_token"])
    acc.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
    acc.is_active = True
    acc.sync_error = None
    db.add(acc)
    await db.commit()

    frontend_url = settings.frontend_url or "http://localhost:3000"
    return RedirectResponse(url=f"{frontend_url}/email?connected=gmail")


# ── Outlook OAuth ─────────────────────────────────────────────────────────────

@router.get("/accounts/connect-outlook")
async def connect_outlook(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.microsoft_client_id:
        raise HTTPException(status_code=501, detail="Outlook OAuth no configurado (falta MICROSOFT_CLIENT_ID)")
    biz = await _get_business(db, current_user)
    state = f"{biz.id}:{secrets.token_urlsafe(16)}"
    redirect_uri = f"{settings.backend_url}/api/email/oauth/outlook/callback"
    url = build_outlook_auth_url(redirect_uri=redirect_uri, state=state)
    return {"auth_url": url}


@router.get("/oauth/outlook/callback")
async def outlook_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    if ":" not in state:
        raise HTTPException(status_code=400, detail="State inválido")
    business_id = state.split(":")[0]

    redirect_uri = f"{settings.backend_url}/api/email/oauth/outlook/callback"
    try:
        tokens = await exchange_outlook_code(code, redirect_uri)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al obtener tokens Outlook: {e}")

    access_token = tokens["access_token"]
    profile = await outlook_get_profile(access_token)
    email_address = profile.get("mail") or profile.get("userPrincipalName", "")

    r = await db.execute(
        select(EmailAccount).where(
            EmailAccount.business_id == business_id,
            EmailAccount.email_address == email_address,
            EmailAccount.provider == "outlook",
        )
    )
    acc = r.scalar_one_or_none() or EmailAccount(
        business_id=business_id, provider="outlook", email_address=email_address
    )
    acc.display_name = profile.get("displayName") or email_address
    acc.access_token_enc = encrypt_secret(access_token)
    if tokens.get("refresh_token"):
        acc.refresh_token_enc = encrypt_secret(tokens["refresh_token"])
    acc.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
    acc.is_active = True
    acc.sync_error = None
    db.add(acc)
    await db.commit()

    frontend_url = settings.frontend_url or "http://localhost:3000"
    return RedirectResponse(url=f"{frontend_url}/email?connected=outlook")


@router.delete("/accounts/{account_id}", status_code=204)
async def disconnect_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    acc = await _get_account(db, account_id, biz.id)
    await db.delete(acc)
    await db.commit()


# ── Sync ──────────────────────────────────────────────────────────────────────

@router.post("/accounts/{account_id}/sync")
async def sync_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    acc = await _get_account(db, account_id, biz.id)

    # Fetch all lead emails for matching
    leads_r = await db.execute(
        select(Lead).where(Lead.business_id == biz.id, Lead.email.isnot(None))
    )
    leads = leads_r.scalars().all()

    # Get existing external_message_ids to avoid duplicates
    existing_r = await db.execute(
        select(Email.external_message_id).where(
            Email.email_account_id == acc.id,
            Email.external_message_id.isnot(None),
        )
    )
    existing_ids = {row[0] for row in existing_r.fetchall()}

    try:
        if acc.provider == "imap":
            password = decrypt_secret(acc.password_enc)
            raw_messages = await imap_sync(acc.imap_host, acc.imap_port, acc.email_address, password)
        elif acc.provider == "gmail":
            access_token = await _ensure_fresh_token(db, acc)
            raw_messages = await gmail_sync_inbox(access_token)
        elif acc.provider == "outlook":
            access_token = await _ensure_fresh_token(db, acc)
            raw_messages = await outlook_sync_inbox(access_token)
        else:
            raise HTTPException(status_code=400, detail="Proveedor desconocido")
    except Exception as e:
        acc.sync_error = str(e)
        await db.commit()
        raise HTTPException(status_code=502, detail=f"Error al sincronizar: {e}")

    new_count = 0
    for m in raw_messages:
        ext_id = m.get("external_message_id", "")
        if ext_id and ext_id in existing_ids:
            continue

        lead_id = _match_lead_to_email(m["from_email"], m.get("to_emails", []), leads)
        email = Email(
            business_id=biz.id,
            email_account_id=acc.id,
            lead_id=lead_id,
            direction="inbound",
            **{k: v for k, v in m.items()},
        )
        db.add(email)
        new_count += 1

    acc.last_synced_at = datetime.now(timezone.utc)
    acc.sync_error = None
    await db.commit()
    logger.info("email_synced", account_id=account_id, new=new_count)
    return {"synced": new_count}


# ── Send ──────────────────────────────────────────────────────────────────────

@router.post("/send", response_model=EmailOut)
async def send_email(
    body: SendEmailRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    acc = await _get_account(db, body.account_id, biz.id)

    try:
        if acc.provider == "imap":
            password = decrypt_secret(acc.password_enc)
            await smtp_send(
                smtp_host=acc.smtp_host, smtp_port=acc.smtp_port, use_tls=acc.smtp_use_tls,
                username=acc.email_address, password=password,
                from_email=acc.email_address, from_name=acc.display_name or "",
                to_emails=[str(e) for e in body.to_emails],
                cc_emails=[str(e) for e in body.cc_emails],
                subject=body.subject, body_html=body.body_html, body_text=body.body_text,
            )
        elif acc.provider == "gmail":
            access_token = await _ensure_fresh_token(db, acc)
            await gmail_send(
                access_token=access_token,
                from_email=acc.email_address, from_name=acc.display_name or "",
                to_emails=[str(e) for e in body.to_emails],
                cc_emails=[str(e) for e in body.cc_emails],
                subject=body.subject, body_html=body.body_html, body_text=body.body_text,
            )
        elif acc.provider == "outlook":
            access_token = await _ensure_fresh_token(db, acc)
            await outlook_send(
                access_token=access_token,
                to_emails=[str(e) for e in body.to_emails],
                cc_emails=[str(e) for e in body.cc_emails],
                subject=body.subject, body_html=body.body_html,
            )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al enviar email: {e}")

    email = Email(
        business_id=biz.id,
        email_account_id=acc.id,
        lead_id=body.lead_id,
        direction="outbound",
        from_email=acc.email_address,
        from_name=acc.display_name or "",
        to_emails=[str(e) for e in body.to_emails],
        cc_emails=[str(e) for e in body.cc_emails],
        subject=body.subject,
        body_html=body.body_html,
        body_text=body.body_text,
        is_read=True,
        sent_at=datetime.now(timezone.utc),
    )
    db.add(email)
    await db.commit()
    await db.refresh(email)
    return email


# ── Inbox ─────────────────────────────────────────────────────────────────────

@router.get("/inbox", response_model=list[EmailOut])
async def get_inbox(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    direction: Optional[str] = Query(None),  # inbound | outbound
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    q = select(Email).where(Email.business_id == biz.id)
    if direction:
        q = q.where(Email.direction == direction)
    if search:
        pattern = f"%{search}%"
        q = q.where(or_(
            Email.subject.ilike(pattern),
            Email.from_email.ilike(pattern),
            Email.body_text.ilike(pattern),
        ))
    q = q.order_by(Email.received_at.desc(), Email.sent_at.desc(), Email.created_at.desc()).limit(limit).offset(offset)
    r = await db.execute(q)
    return r.scalars().all()


@router.get("/leads/{lead_id}", response_model=list[EmailOut])
async def get_lead_emails(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(
        select(Email)
        .where(Email.business_id == biz.id, Email.lead_id == lead_id)
        .order_by(Email.received_at.asc(), Email.sent_at.asc(), Email.created_at.asc())
    )
    return r.scalars().all()


@router.patch("/inbox/{email_id}/read", status_code=204)
async def mark_read(
    email_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(select(Email).where(Email.id == email_id, Email.business_id == biz.id))
    email = r.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=404, detail="Email no encontrado")
    email.is_read = True
    await db.commit()


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=list[EmailTemplateOut])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(
        select(EmailTemplate)
        .where(EmailTemplate.business_id == biz.id)
        .order_by(EmailTemplate.created_at.desc())
    )
    return r.scalars().all()


@router.post("/templates", response_model=EmailTemplateOut)
async def create_template(
    body: EmailTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    tmpl = EmailTemplate(business_id=biz.id, **body.model_dump())
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.put("/templates/{template_id}", response_model=EmailTemplateOut)
async def update_template(
    template_id: str,
    body: EmailTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(
        select(EmailTemplate).where(
            EmailTemplate.id == template_id, EmailTemplate.business_id == biz.id
        )
    )
    tmpl = r.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    for k, v in body.model_dump().items():
        setattr(tmpl, k, v)
    tmpl.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.delete("/templates/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(
        select(EmailTemplate).where(
            EmailTemplate.id == template_id, EmailTemplate.business_id == biz.id
        )
    )
    tmpl = r.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    await db.delete(tmpl)
    await db.commit()


# ── AI Draft ─────────────────────────────────────────────────────────────────

class AiDraftRequest(BaseModel):
    from_email: str
    from_name: Optional[str] = None
    subject: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    account_id: Optional[str] = None  # to include signature in draft


class AiDraftResponse(BaseModel):
    subject: str
    body_html: str
    body_text: str


@router.post("/ai-draft", response_model=AiDraftResponse)
async def generate_ai_draft(
    payload: AiDraftRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera un borrador de respuesta de email usando Claude (Petunia)."""
    biz = await _get_business(db, current_user)

    # Obtain signature if an account is specified
    signature_html = ""
    if payload.account_id:
        r = await db.execute(
            select(EmailAccount).where(
                EmailAccount.id == payload.account_id,
                EmailAccount.business_id == biz.id,
            )
        )
        acc = r.scalar_one_or_none()
        if acc and acc.signature_html:
            signature_html = acc.signature_html

    # Build business context
    biz_ctx = "\n".join(filter(None, [
        f"Empresa: {biz.name}" if biz.name else "",
        f"Industria: {biz.industry}" if getattr(biz, "industry", None) else "",
        f"Descripción: {biz.description}" if getattr(biz, "description", None) else "",
        f"Producto/Servicio: {biz.product_description}" if getattr(biz, "product_description", None) else "",
        f"Propuesta de valor: {biz.value_proposition}" if getattr(biz, "value_proposition", None) else "",
    ]))

    # Clean body (prefer text over HTML)
    original_body = (payload.body_text or "").strip()
    if not original_body and payload.body_html:
        # Very naive HTML → text strip
        import re
        original_body = re.sub(r"<[^>]+>", " ", payload.body_html).strip()

    system_prompt = f"""Eres Petunia, asistente de ventas de IA para la siguiente empresa:

{biz_ctx}

Tu tarea es redactar una respuesta profesional, cálida y persuasiva a un email recibido.
- Responde SIEMPRE en el mismo idioma del email original (si está en español, responde en español; si está en inglés, responde en inglés).
- El tono debe ser profesional pero cercano, orientado a ventas/CRM.
- No incluyas la firma (se agrega automáticamente).
- Devuelve SOLO el cuerpo del email como HTML limpio (sin <html>, <head>, <body> externos). Usa <p>, <br>, <b> si es necesario pero mantén el HTML simple.
- NO incluyas líneas como "Estimado/a [nombre]:" a menos que sepas el nombre real.
- El asunto de respuesta debe empezar con "Re: " seguido del asunto original."""

    original_subject = payload.subject or "(sin asunto)"
    from_label = payload.from_name or payload.from_email

    user_message = f"""Email recibido:
De: {from_label} <{payload.from_email}>
Asunto: {original_subject}

{original_body}

---
Redacta una respuesta profesional a este email. Primero devuelve el ASUNTO (en una línea que empiece con "ASUNTO:") y luego el CUERPO en HTML en las líneas siguientes (sin marcador especial)."""

    try:
        client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        message = await client.messages.create(
            model=settings.claude_model,
            max_tokens=1500,
            temperature=0.6,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = message.content[0].text.strip()
    except Exception as e:
        logger.error("ai_draft_error", error=str(e))
        raise HTTPException(status_code=502, detail=f"Error al generar borrador con IA: {str(e)}")

    # Parse subject line and body
    lines = raw.splitlines()
    reply_subject = f"Re: {original_subject}"
    body_lines_start = 0
    for i, line in enumerate(lines):
        if line.strip().upper().startswith("ASUNTO:"):
            reply_subject = line.split(":", 1)[1].strip()
            body_lines_start = i + 1
            break

    body_html = "\n".join(lines[body_lines_start:]).strip()

    # Wrap plain text blocks in <p> if the model returned plain text
    if not body_html.startswith("<"):
        body_html = "".join(f"<p>{p.strip()}</p>" for p in body_html.split("\n\n") if p.strip())

    import re
    body_text = re.sub(r"<[^>]+>", " ", body_html).strip()

    return AiDraftResponse(
        subject=reply_subject,
        body_html=body_html,
        body_text=body_text,
    )
