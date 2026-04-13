"""
API de Seguimientos (FollowUps) y Actividades de Lead.

Endpoints:
  GET    /followups/stats              - KPIs globales
  GET    /followups/calendar           - agrupado por fecha para la vista calendario
  GET    /followups/                   - lista paginada con filtros
  POST   /followups/                   - crear seguimiento
  PATCH  /followups/{id}               - actualizar
  PATCH  /followups/{id}/complete      - marcar como completado
  DELETE /followups/{id}               - cancelar (soft)

  GET    /leads/{lead_id}/activities   - timeline de actividades del lead
  POST   /leads/{lead_id}/activities   - registrar nueva actividad
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, asc
from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.followup import FollowUp, LeadActivity
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid

router = APIRouter(tags=["followups"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class FollowUpCreate(BaseModel):
    lead_id: str
    followup_type: str = "call"         # call | email | whatsapp | meeting | task
    title: str
    description: Optional[str] = None
    priority: str = "medium"            # low | medium | high | urgent
    scheduled_at: datetime
    assigned_to: str = "ai"
    notify_email: bool = True
    notify_whatsapp: bool = False

class FollowUpUpdate(BaseModel):
    followup_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    notify_email: Optional[bool] = None
    notify_whatsapp: Optional[bool] = None
    status: Optional[str] = None

class ActivityCreate(BaseModel):
    activity_type: str = "note"         # call | email | whatsapp | meeting | note | stage_change
    title: str
    description: Optional[str] = None
    outcome: Optional[str] = None       # contacted | no_answer | interested | not_interested
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# ─── helper ───────────────────────────────────────────────────────────────────

def _fu_to_dict(fu: FollowUp, lead: Lead | None = None) -> dict:
    return {
        "id": fu.id,
        "lead_id": fu.lead_id,
        "lead_name": lead.name if lead else None,
        "lead_email": lead.email if lead else None,
        "lead_company": lead.company if lead else None,
        "lead_stage": lead.stage if lead else None,
        "followup_type": fu.followup_type,
        "title": fu.title,
        "description": fu.description,
        "status": fu.status,
        "priority": fu.priority,
        "scheduled_at": fu.scheduled_at.isoformat() if fu.scheduled_at else None,
        "completed_at": fu.completed_at.isoformat() if fu.completed_at else None,
        "assigned_to": fu.assigned_to,
        "is_ai_generated": fu.is_ai_generated,
        "notify_email": fu.notify_email,
        "notify_whatsapp": fu.notify_whatsapp,
        "created_by": fu.created_by,
        "created_at": fu.created_at.isoformat() if fu.created_at else None,
        "updated_at": fu.updated_at.isoformat() if fu.updated_at else None,
    }

def _act_to_dict(a: LeadActivity) -> dict:
    return {
        "id": a.id,
        "lead_id": a.lead_id,
        "activity_type": a.activity_type,
        "title": a.title,
        "description": a.description,
        "outcome": a.outcome,
        "scheduled_at": a.scheduled_at.isoformat() if a.scheduled_at else None,
        "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        "created_by": a.created_by,
        "is_ai_generated": a.is_ai_generated,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ─── FOLLOWUPS ────────────────────────────────────────────────────────────────

@router.get("/followups/stats")
async def followup_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """KPIs para el header del módulo de seguimiento."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end   = today_start + timedelta(days=1)
    week_end    = today_start + timedelta(days=7)

    bid = current_user.business_id

    async def count(where_clauses) -> int:
        q = select(func.count()).select_from(FollowUp).where(
            FollowUp.business_id == bid, *where_clauses
        )
        return (await db.execute(q)).scalar() or 0

    overdue  = await count([FollowUp.status == "pending", FollowUp.scheduled_at < now])
    today    = await count([FollowUp.status == "pending",
                            FollowUp.scheduled_at >= today_start, FollowUp.scheduled_at < today_end])
    week     = await count([FollowUp.status == "pending",
                            FollowUp.scheduled_at >= today_start, FollowUp.scheduled_at < week_end])
    total_pending = await count([FollowUp.status == "pending"])
    completed_today = await count([FollowUp.status == "completed",
                                   FollowUp.completed_at >= today_start, FollowUp.completed_at < today_end])

    return {
        "overdue": overdue,
        "today": today,
        "this_week": week,
        "total_pending": total_pending,
        "completed_today": completed_today,
    }


@router.get("/followups/calendar")
async def followup_calendar(
    year: int = Query(default=None),
    month: int = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve followups agrupados por fecha (YYYY-MM-DD) para el calendario."""
    now = datetime.now(timezone.utc)
    y = year  or now.year
    m = month or now.month

    # Rango del mes
    start = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(y, m + 1, 1, tzinfo=timezone.utc)

    res = await db.execute(
        select(FollowUp)
        .where(
            FollowUp.business_id == current_user.business_id,
            FollowUp.status.notin_(["cancelled"]),
            FollowUp.scheduled_at >= start,
            FollowUp.scheduled_at < end,
        )
        .order_by(asc(FollowUp.scheduled_at))
    )
    followups = res.scalars().all()

    # Cargar leads
    lead_ids = list({fu.lead_id for fu in followups})
    leads_map: dict[str, Lead] = {}
    if lead_ids:
        lr = await db.execute(select(Lead).where(Lead.id.in_(lead_ids)))
        for lead in lr.scalars().all():
            leads_map[lead.id] = lead

    # Agrupar por fecha
    grouped: dict[str, list] = {}
    for fu in followups:
        day = fu.scheduled_at.strftime("%Y-%m-%d")
        grouped.setdefault(day, []).append(_fu_to_dict(fu, leads_map.get(fu.lead_id)))

    return {"year": y, "month": m, "days": grouped}


@router.get("/followups")
async def list_followups(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    followup_type: Optional[str] = None,
    lead_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to:   Optional[datetime] = None,
    period: Optional[str] = None,   # today | overdue | week
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    where = [FollowUp.business_id == current_user.business_id, FollowUp.status != "cancelled"]

    if status:
        where.append(FollowUp.status == status)
    if priority:
        where.append(FollowUp.priority == priority)
    if followup_type:
        where.append(FollowUp.followup_type == followup_type)
    if lead_id:
        where.append(FollowUp.lead_id == lead_id)
    if assigned_to:
        where.append(FollowUp.assigned_to == assigned_to)
    if date_from:
        where.append(FollowUp.scheduled_at >= date_from)
    if date_to:
        where.append(FollowUp.scheduled_at <= date_to)
    if period == "today":
        where.append(FollowUp.scheduled_at >= today_start)
        where.append(FollowUp.scheduled_at < today_start + timedelta(days=1))
        where.append(FollowUp.status == "pending")
    elif period == "overdue":
        where.append(FollowUp.scheduled_at < now)
        where.append(FollowUp.status == "pending")
    elif period == "week":
        where.append(FollowUp.scheduled_at >= today_start)
        where.append(FollowUp.scheduled_at < today_start + timedelta(days=7))
        where.append(FollowUp.status == "pending")

    res = await db.execute(
        select(FollowUp)
        .where(*where)
        .order_by(asc(FollowUp.scheduled_at))
        .limit(limit).offset(offset)
    )
    followups = res.scalars().all()

    lead_ids = list({fu.lead_id for fu in followups})
    leads_map: dict[str, Lead] = {}
    if lead_ids:
        lr = await db.execute(select(Lead).where(Lead.id.in_(lead_ids)))
        for lead in lr.scalars().all():
            leads_map[lead.id] = lead

    return [_fu_to_dict(fu, leads_map.get(fu.lead_id)) for fu in followups]


@router.post("/followups", status_code=201)
async def create_followup(
    data: FollowUpCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verificar que el lead pertenece al negocio
    lead_res = await db.execute(
        select(Lead).where(Lead.id == data.lead_id, Lead.business_id == current_user.business_id)
    )
    lead = lead_res.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead no encontrado")

    fu = FollowUp(
        id=str(uuid.uuid4()),
        business_id=current_user.business_id,
        lead_id=data.lead_id,
        followup_type=data.followup_type,
        title=data.title,
        description=data.description,
        priority=data.priority,
        scheduled_at=data.scheduled_at,
        assigned_to=data.assigned_to,
        notify_email=data.notify_email,
        notify_whatsapp=data.notify_whatsapp,
        created_by=current_user.id,
        is_ai_generated=False,
        status="pending",
    )
    db.add(fu)

    # Actualizar next_followup_at del lead si es la más próxima
    now = datetime.now(timezone.utc)
    if data.scheduled_at > now:
        if not lead.next_followup_at or data.scheduled_at < lead.next_followup_at:
            lead.next_followup_at = data.scheduled_at

    await db.commit()
    await db.refresh(fu)
    return _fu_to_dict(fu, lead)


@router.patch("/followups/{followup_id}")
async def update_followup(
    followup_id: str,
    data: FollowUpUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(FollowUp).where(FollowUp.id == followup_id, FollowUp.business_id == current_user.business_id)
    )
    fu = res.scalar_one_or_none()
    if not fu:
        raise HTTPException(404, "Seguimiento no encontrado")

    for k, v in data.model_dump(exclude_none=True).items():
        setattr(fu, k, v)

    await db.commit()
    await db.refresh(fu)
    return _fu_to_dict(fu)


@router.patch("/followups/{followup_id}/complete")
async def complete_followup(
    followup_id: str,
    outcome: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Marcar seguimiento como completado y registrar actividad en el lead."""
    res = await db.execute(
        select(FollowUp).where(FollowUp.id == followup_id, FollowUp.business_id == current_user.business_id)
    )
    fu = res.scalar_one_or_none()
    if not fu:
        raise HTTPException(404, "Seguimiento no encontrado")

    now = datetime.now(timezone.utc)
    fu.status = "completed"
    fu.completed_at = now

    # Registrar actividad en el lead
    activity = LeadActivity(
        id=str(uuid.uuid4()),
        business_id=current_user.business_id,
        lead_id=fu.lead_id,
        activity_type=fu.followup_type,
        title=f"{fu.title} — completado",
        description=fu.description,
        outcome=outcome,
        completed_at=now,
        created_by=current_user.id,
        is_ai_generated=False,
    )
    db.add(activity)

    # Actualizar last_contacted_at del lead
    lead_res = await db.execute(select(Lead).where(Lead.id == fu.lead_id))
    lead = lead_res.scalar_one_or_none()
    if lead:
        lead.last_contacted_at = now

    await db.commit()
    await db.refresh(fu)
    return _fu_to_dict(fu)


@router.delete("/followups/{followup_id}", status_code=204)
async def cancel_followup(
    followup_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(FollowUp).where(FollowUp.id == followup_id, FollowUp.business_id == current_user.business_id)
    )
    fu = res.scalar_one_or_none()
    if not fu:
        raise HTTPException(404, "Seguimiento no encontrado")
    fu.status = "cancelled"
    await db.commit()


# ─── LEAD ACTIVITIES ──────────────────────────────────────────────────────────

@router.get("/leads/{lead_id}/activities")
async def list_activities(
    lead_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verificar acceso al lead
    lead_res = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.business_id == current_user.business_id)
    )
    if not lead_res.scalar_one_or_none():
        raise HTTPException(404, "Lead no encontrado")

    res = await db.execute(
        select(LeadActivity)
        .where(LeadActivity.lead_id == lead_id)
        .order_by(desc(LeadActivity.created_at))
        .limit(limit)
    )
    return [_act_to_dict(a) for a in res.scalars().all()]


@router.post("/leads/{lead_id}/activities", status_code=201)
async def create_activity(
    lead_id: str,
    data: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead_res = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.business_id == current_user.business_id)
    )
    lead = lead_res.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead no encontrado")

    activity = LeadActivity(
        id=str(uuid.uuid4()),
        business_id=current_user.business_id,
        lead_id=lead_id,
        activity_type=data.activity_type,
        title=data.title,
        description=data.description,
        outcome=data.outcome,
        scheduled_at=data.scheduled_at,
        completed_at=data.completed_at or datetime.now(timezone.utc),
        created_by=current_user.id,
        is_ai_generated=False,
    )
    db.add(activity)

    # Actualizar last_contacted_at si es una actividad de contacto
    CONTACT_TYPES = {"call", "email", "whatsapp", "meeting"}
    if data.activity_type in CONTACT_TYPES:
        lead.last_contacted_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(activity)
    return _act_to_dict(activity)
