"""
Email Marketing API — Campaigns & Sequences (SendGrid)

Campaigns: envíos masivos a leads
Sequences: cadenas automáticas de emails en el tiempo

Endpoints:
  GET  /email/campaigns                          — Listar campañas
  POST /email/campaigns                          — Crear campaña
  GET  /email/campaigns/{id}                     — Detalle de campaña
  PATCH /email/campaigns/{id}                    — Actualizar campaña
  DELETE /email/campaigns/{id}                   — Eliminar campaña
  POST /email/campaigns/{id}/send                — Enviar campaña ahora
  POST /email/campaigns/{id}/test                — Enviar test a un email

  GET  /email/sequences                          — Listar secuencias
  POST /email/sequences                          — Crear secuencia
  GET  /email/sequences/{id}                     — Detalle con pasos
  PATCH /email/sequences/{id}                    — Actualizar
  DELETE /email/sequences/{id}                   — Eliminar
  POST /email/sequences/{id}/steps               — Añadir paso
  PATCH /email/sequences/{id}/steps/{step_id}    — Editar paso
  DELETE /email/sequences/{id}/steps/{step_id}   — Eliminar paso
  POST /email/sequences/{id}/enroll              — Inscribir leads
  GET  /email/sequences/{id}/enrollments         — Ver inscritos

  POST /email/webhook/sendgrid                   — Webhook de eventos SendGrid

  GET  /email/marketing/stats                    — Stats globales de marketing
"""
from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.business import Business
from app.models.email_campaign import (
    EmailCampaign,
    EmailSend,
    EmailSequence,
    EmailSequenceEnrollment,
    EmailSequenceStep,
)
from app.models.lead import Lead
from app.models.user import User
from app.services import sendgrid_service as sg

logger = structlog.get_logger()
router = APIRouter(prefix="/email", tags=["email-marketing"])


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_business(db: AsyncSession, user: User) -> Business:
    r = await db.execute(select(Business).where(Business.id == user.business_id))
    biz = r.scalar_one_or_none()
    if not biz:
        raise HTTPException(404, "Negocio no encontrado")
    return biz


async def _get_campaign(db: AsyncSession, campaign_id: str, business_id: str) -> EmailCampaign:
    r = await db.execute(
        select(EmailCampaign).where(
            EmailCampaign.id == campaign_id,
            EmailCampaign.business_id == business_id,
        )
    )
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Campaña no encontrada")
    return c


async def _get_sequence(db: AsyncSession, seq_id: str, business_id: str) -> EmailSequence:
    r = await db.execute(
        select(EmailSequence).where(
            EmailSequence.id == seq_id,
            EmailSequence.business_id == business_id,
        )
    )
    s = r.scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Secuencia no encontrada")
    return s


async def _get_leads_for_filter(
    db: AsyncSession,
    business_id: str,
    audience_filter: str | None,
) -> list[Lead]:
    """Return leads matching audience_filter JSON or all leads if None."""
    q = select(Lead).where(Lead.business_id == business_id, Lead.email.isnot(None))
    if audience_filter:
        try:
            f = json.loads(audience_filter)
            if f.get("stage"):
                q = q.where(Lead.stage == f["stage"])
            if f.get("source"):
                q = q.where(Lead.source == f["source"])
        except Exception:
            pass
    r = await db.execute(q)
    return r.scalars().all()


# ── Schemas ────────────────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    subject: str
    body_html: str
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    reply_to: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    audience_filter: Optional[str] = None  # JSON string


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    reply_to: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    audience_filter: Optional[str] = None


class CampaignOut(BaseModel):
    id: str
    name: str
    subject: str
    status: str
    from_name: Optional[str]
    from_email: Optional[str]
    reply_to: Optional[str]
    body_html: str
    scheduled_at: Optional[datetime]
    sent_at: Optional[datetime]
    total_sent: int
    total_opened: int
    total_clicked: int
    total_bounced: int
    total_unsubscribed: int
    audience_filter: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class SequenceStepCreate(BaseModel):
    step_number: int
    subject: str
    body_html: str
    delay_hours: int = 24


class SequenceStepOut(BaseModel):
    id: str
    step_number: int
    subject: str
    body_html: str
    delay_hours: int
    model_config = {"from_attributes": True}


class SequenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger: str = "manual"
    trigger_config: Optional[str] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None
    steps: list[SequenceStepCreate] = []


class SequenceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[str] = None
    trigger_config: Optional[str] = None
    is_active: Optional[bool] = None
    from_name: Optional[str] = None
    from_email: Optional[str] = None


class SequenceOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    trigger: str
    trigger_config: Optional[str]
    is_active: bool
    from_name: Optional[str]
    from_email: Optional[str]
    steps: list[SequenceStepOut] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class EnrollRequest(BaseModel):
    lead_ids: list[str]


class TestSendRequest(BaseModel):
    email: str


# ── Campaign endpoints ─────────────────────────────────────────────────────────

@router.get("/campaigns", response_model=list[CampaignOut])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(
        select(EmailCampaign)
        .where(EmailCampaign.business_id == biz.id)
        .order_by(EmailCampaign.created_at.desc())
    )
    return r.scalars().all()


@router.post("/campaigns", response_model=CampaignOut)
async def create_campaign(
    payload: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    c = EmailCampaign(
        business_id=biz.id,
        name=payload.name,
        subject=payload.subject,
        body_html=payload.body_html,
        from_name=payload.from_name,
        from_email=payload.from_email,
        reply_to=payload.reply_to,
        scheduled_at=payload.scheduled_at,
        audience_filter=payload.audience_filter,
        status="draft",
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c


@router.get("/campaigns/{campaign_id}", response_model=CampaignOut)
async def get_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    return await _get_campaign(db, campaign_id, biz.id)


@router.patch("/campaigns/{campaign_id}", response_model=CampaignOut)
async def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    c = await _get_campaign(db, campaign_id, biz.id)
    if c.status == "sent":
        raise HTTPException(400, "No se puede editar una campaña ya enviada")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(c, field, val)
    await db.commit()
    await db.refresh(c)
    return c


@router.delete("/campaigns/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    c = await _get_campaign(db, campaign_id, biz.id)
    await db.delete(c)
    await db.commit()


@router.post("/campaigns/{campaign_id}/test")
async def test_send_campaign(
    campaign_id: str,
    payload: TestSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    c = await _get_campaign(db, campaign_id, biz.id)
    msg_id = await sg.send_single(
        to_email=payload.email,
        subject=f"[TEST] {c.subject}",
        html_content=c.body_html,
        from_email=c.from_email,
        from_name=c.from_name,
        reply_to=c.reply_to,
    )
    if not msg_id:
        raise HTTPException(503, "Error al enviar email de prueba. Verifica la configuración de SendGrid.")
    return {"ok": True, "message_id": msg_id}


@router.post("/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    c = await _get_campaign(db, campaign_id, biz.id)
    if c.status == "sent":
        raise HTTPException(400, "Esta campaña ya fue enviada")
    if c.status == "sending":
        raise HTTPException(400, "Esta campaña ya está enviándose")

    leads = await _get_leads_for_filter(db, biz.id, c.audience_filter)
    if not leads:
        raise HTTPException(400, "No hay leads con email en la audiencia seleccionada")

    c.status = "sending"
    await db.commit()

    background_tasks.add_task(_do_send_campaign, campaign_id, biz.id, leads, c.subject, c.body_html, c.from_name, c.from_email, c.reply_to)

    return {"ok": True, "total_recipients": len(leads)}


async def _do_send_campaign(
    campaign_id: str,
    business_id: str,
    leads: list[Lead],
    subject: str,
    body_html: str,
    from_name: str | None,
    from_email: str | None,
    reply_to: str | None,
):
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            recipients = [
                {"email": l.email, "name": l.name or l.email, "lead_id": str(l.id)}
                for l in leads
                if l.email
            ]
            results = await sg.send_campaign_batch(
                recipients=recipients,
                subject=subject,
                html_content=body_html,
                campaign_id=campaign_id,
                from_email=from_email,
                from_name=from_name,
                reply_to=reply_to,
            )

            # Create EmailSend records
            for r in recipients:
                msg_id = results.get(r["email"])
                send = EmailSend(
                    business_id=business_id,
                    campaign_id=campaign_id,
                    lead_id=r["lead_id"],
                    to_email=r["email"],
                    subject=subject,
                    sendgrid_message_id=msg_id,
                    status="sent",
                )
                db.add(send)

            # Update campaign stats
            campaign = await db.get(EmailCampaign, campaign_id)
            if campaign:
                campaign.total_sent = len(results)
                campaign.status = "sent"
                campaign.sent_at = datetime.now(timezone.utc)

            await db.commit()
            logger.info("campaign_sent", campaign_id=campaign_id, sent=len(results))
        except Exception as e:
            logger.error("campaign_send_failed", campaign_id=campaign_id, error=str(e))
            campaign = await db.get(EmailCampaign, campaign_id)
            if campaign:
                campaign.status = "draft"
                await db.commit()


# ── Sequence endpoints ─────────────────────────────────────────────────────────

@router.get("/sequences", response_model=list[SequenceOut])
async def list_sequences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    r = await db.execute(
        select(EmailSequence)
        .where(EmailSequence.business_id == biz.id)
        .order_by(EmailSequence.created_at.desc())
    )
    seqs = r.scalars().all()
    # Load steps for each
    results = []
    for s in seqs:
        sr = await db.execute(
            select(EmailSequenceStep)
            .where(EmailSequenceStep.sequence_id == s.id)
            .order_by(EmailSequenceStep.step_number)
        )
        steps = sr.scalars().all()
        results.append({**s.__dict__, "steps": steps})
    return results


@router.post("/sequences", response_model=SequenceOut)
async def create_sequence(
    payload: SequenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    seq = EmailSequence(
        business_id=biz.id,
        name=payload.name,
        description=payload.description,
        trigger=payload.trigger,
        trigger_config=payload.trigger_config,
        from_name=payload.from_name,
        from_email=payload.from_email,
        is_active=True,
    )
    db.add(seq)
    await db.flush()  # get seq.id

    for step_data in payload.steps:
        step = EmailSequenceStep(
            sequence_id=seq.id,
            step_number=step_data.step_number,
            subject=step_data.subject,
            body_html=step_data.body_html,
            delay_hours=step_data.delay_hours,
        )
        db.add(step)

    await db.commit()
    await db.refresh(seq)

    sr = await db.execute(
        select(EmailSequenceStep)
        .where(EmailSequenceStep.sequence_id == seq.id)
        .order_by(EmailSequenceStep.step_number)
    )
    steps = sr.scalars().all()
    return {**seq.__dict__, "steps": steps}


@router.get("/sequences/{sequence_id}", response_model=SequenceOut)
async def get_sequence(
    sequence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    seq = await _get_sequence(db, sequence_id, biz.id)
    sr = await db.execute(
        select(EmailSequenceStep)
        .where(EmailSequenceStep.sequence_id == seq.id)
        .order_by(EmailSequenceStep.step_number)
    )
    steps = sr.scalars().all()
    return {**seq.__dict__, "steps": steps}


@router.patch("/sequences/{sequence_id}", response_model=SequenceOut)
async def update_sequence(
    sequence_id: str,
    payload: SequenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    seq = await _get_sequence(db, sequence_id, biz.id)
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(seq, field, val)
    await db.commit()
    await db.refresh(seq)
    sr = await db.execute(
        select(EmailSequenceStep).where(EmailSequenceStep.sequence_id == seq.id).order_by(EmailSequenceStep.step_number)
    )
    return {**seq.__dict__, "steps": sr.scalars().all()}


@router.delete("/sequences/{sequence_id}", status_code=204)
async def delete_sequence(
    sequence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    seq = await _get_sequence(db, sequence_id, biz.id)
    await db.delete(seq)
    await db.commit()


@router.post("/sequences/{sequence_id}/steps", response_model=SequenceStepOut)
async def add_step(
    sequence_id: str,
    payload: SequenceStepCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    seq = await _get_sequence(db, sequence_id, biz.id)
    step = EmailSequenceStep(
        sequence_id=seq.id,
        step_number=payload.step_number,
        subject=payload.subject,
        body_html=payload.body_html,
        delay_hours=payload.delay_hours,
    )
    db.add(step)
    await db.commit()
    await db.refresh(step)
    return step


@router.patch("/sequences/{sequence_id}/steps/{step_id}", response_model=SequenceStepOut)
async def update_step(
    sequence_id: str,
    step_id: str,
    payload: SequenceStepCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    await _get_sequence(db, sequence_id, biz.id)
    r = await db.execute(
        select(EmailSequenceStep).where(
            EmailSequenceStep.id == step_id,
            EmailSequenceStep.sequence_id == sequence_id,
        )
    )
    step = r.scalar_one_or_none()
    if not step:
        raise HTTPException(404, "Paso no encontrado")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(step, field, val)
    await db.commit()
    await db.refresh(step)
    return step


@router.delete("/sequences/{sequence_id}/steps/{step_id}", status_code=204)
async def delete_step(
    sequence_id: str,
    step_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    await _get_sequence(db, sequence_id, biz.id)
    r = await db.execute(
        select(EmailSequenceStep).where(
            EmailSequenceStep.id == step_id,
            EmailSequenceStep.sequence_id == sequence_id,
        )
    )
    step = r.scalar_one_or_none()
    if not step:
        raise HTTPException(404, "Paso no encontrado")
    await db.delete(step)
    await db.commit()


@router.post("/sequences/{sequence_id}/enroll")
async def enroll_leads(
    sequence_id: str,
    payload: EnrollRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    seq = await _get_sequence(db, sequence_id, biz.id)

    # Get first step to calculate next_send_at
    sr = await db.execute(
        select(EmailSequenceStep)
        .where(EmailSequenceStep.sequence_id == seq.id)
        .order_by(EmailSequenceStep.step_number)
        .limit(1)
    )
    first_step = sr.scalar_one_or_none()
    if not first_step:
        raise HTTPException(400, "La secuencia no tiene pasos. Agrega al menos un paso primero.")

    enrolled = 0
    skipped = 0
    now = datetime.now(timezone.utc)

    for lead_id in payload.lead_ids:
        # Check if already enrolled
        er = await db.execute(
            select(EmailSequenceEnrollment).where(
                EmailSequenceEnrollment.sequence_id == seq.id,
                EmailSequenceEnrollment.lead_id == lead_id,
            )
        )
        existing = er.scalar_one_or_none()
        if existing:
            skipped += 1
            continue

        enrollment = EmailSequenceEnrollment(
            sequence_id=seq.id,
            lead_id=lead_id,
            business_id=biz.id,
            current_step=0,
            status="active",
            next_send_at=now,  # send first step immediately (or scheduler will pick it up)
        )
        db.add(enrollment)
        enrolled += 1

    await db.commit()
    return {"enrolled": enrolled, "skipped_already_enrolled": skipped}


@router.get("/sequences/{sequence_id}/enrollments")
async def list_enrollments(
    sequence_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    await _get_sequence(db, sequence_id, biz.id)
    r = await db.execute(
        select(EmailSequenceEnrollment)
        .where(EmailSequenceEnrollment.sequence_id == sequence_id)
        .order_by(EmailSequenceEnrollment.enrolled_at.desc())
    )
    enrollments = r.scalars().all()
    return [
        {
            "id": e.id,
            "lead_id": e.lead_id,
            "current_step": e.current_step,
            "status": e.status,
            "next_send_at": e.next_send_at,
            "enrolled_at": e.enrolled_at,
            "completed_at": e.completed_at,
        }
        for e in enrollments
    ]


# ── SendGrid Event Webhook ─────────────────────────────────────────────────────

@router.post("/webhook/sendgrid", include_in_schema=False)
async def sendgrid_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle SendGrid event webhooks: delivered, open, click, bounce, unsubscribe."""
    try:
        body = await request.json()
        events = body if isinstance(body, list) else [body]
    except Exception:
        return {"ok": True}

    parsed = sg.parse_webhook_events(events)

    for ev in parsed:
        if not ev["message_id"]:
            continue

        # Update EmailSend record
        sr = await db.execute(
            select(EmailSend).where(EmailSend.sendgrid_message_id == ev["message_id"])
        )
        send = sr.scalar_one_or_none()
        if send:
            if ev["type"] == "open" and not send.opened_at:
                send.opened_at = ev["timestamp"]
                send.status = "opened"
            elif ev["type"] == "click" and not send.clicked_at:
                send.clicked_at = ev["timestamp"]
                send.status = "clicked"
            elif ev["type"] in ("bounce", "dropped"):
                send.bounced_at = ev["timestamp"]
                send.status = "bounced"
            elif ev["type"] == "unsubscribe":
                send.status = "unsubscribed"

        # Update campaign aggregate stats
        if ev["campaign_id"]:
            cr = await db.execute(
                select(EmailCampaign).where(EmailCampaign.id == ev["campaign_id"])
            )
            campaign = cr.scalar_one_or_none()
            if campaign:
                if ev["type"] == "open":
                    campaign.total_opened = (campaign.total_opened or 0) + 1
                elif ev["type"] == "click":
                    campaign.total_clicked = (campaign.total_clicked or 0) + 1
                elif ev["type"] in ("bounce", "dropped"):
                    campaign.total_bounced = (campaign.total_bounced or 0) + 1
                elif ev["type"] == "unsubscribe":
                    campaign.total_unsubscribed = (campaign.total_unsubscribed or 0) + 1

        # Unsubscribe from active sequence enrollments
        if ev["type"] == "unsubscribe" and ev["enrollment_id"]:
            enr = await db.get(EmailSequenceEnrollment, ev["enrollment_id"])
            if enr:
                enr.status = "unsubscribed"

    await db.commit()
    return {"ok": True}


# ── Marketing stats ────────────────────────────────────────────────────────────

@router.get("/marketing/stats")
async def marketing_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)

    total_campaigns = await db.scalar(
        select(func.count()).where(EmailCampaign.business_id == biz.id)
    )
    total_sent = await db.scalar(
        select(func.sum(EmailCampaign.total_sent)).where(EmailCampaign.business_id == biz.id)
    ) or 0
    total_opened = await db.scalar(
        select(func.sum(EmailCampaign.total_opened)).where(EmailCampaign.business_id == biz.id)
    ) or 0
    total_clicked = await db.scalar(
        select(func.sum(EmailCampaign.total_clicked)).where(EmailCampaign.business_id == biz.id)
    ) or 0
    total_sequences = await db.scalar(
        select(func.count()).where(EmailSequence.business_id == biz.id)
    )
    active_enrollments = await db.scalar(
        select(func.count()).where(
            EmailSequenceEnrollment.business_id == biz.id,
            EmailSequenceEnrollment.status == "active",
        )
    )

    open_rate = round((total_opened / total_sent * 100), 1) if total_sent > 0 else 0
    click_rate = round((total_clicked / total_sent * 100), 1) if total_sent > 0 else 0

    return {
        "total_campaigns": total_campaigns,
        "total_sent": total_sent,
        "total_opened": total_opened,
        "total_clicked": total_clicked,
        "open_rate": open_rate,
        "click_rate": click_rate,
        "total_sequences": total_sequences,
        "active_enrollments": active_enrollments,
    }
