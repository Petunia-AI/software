import csv
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.database import get_db
from app.models.conversation import Conversation, ConversationStatus, Channel
from app.models.lead import Lead, LeadStage
from app.models.message import Message
from app.api.auth import get_current_user
from app.models.user import User
from app.schemas.analytics import DashboardStats
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bid = current_user.business_id

    # Conversaciones
    total_conv = await db.scalar(
        select(func.count(Conversation.id)).where(Conversation.business_id == bid)
    )
    active_conv = await db.scalar(
        select(func.count(Conversation.id)).where(
            Conversation.business_id == bid,
            Conversation.status == ConversationStatus.ACTIVE,
        )
    )

    # Leads
    total_leads = await db.scalar(
        select(func.count(Lead.id)).where(Lead.business_id == bid, Lead.is_active == True)
    )
    qualified_leads = await db.scalar(
        select(func.count(Lead.id)).where(
            Lead.business_id == bid,
            Lead.qualification_score >= 7,
            Lead.is_active == True,
        )
    )
    closed_won = await db.scalar(
        select(func.count(Lead.id)).where(
            Lead.business_id == bid,
            Lead.stage == LeadStage.CLOSED_WON,
        )
    )

    # Score promedio
    avg_score = await db.scalar(
        select(func.avg(Lead.qualification_score)).where(
            Lead.business_id == bid,
            Lead.is_active == True,
        )
    )

    # Conversaciones por canal
    channel_result = await db.execute(
        select(Conversation.channel, func.count(Conversation.id))
        .where(Conversation.business_id == bid)
        .group_by(Conversation.channel)
    )
    conv_by_channel = dict(channel_result.all())

    # Leads por etapa
    stage_result = await db.execute(
        select(Lead.stage, func.count(Lead.id))
        .where(Lead.business_id == bid, Lead.is_active == True)
        .group_by(Lead.stage)
    )
    leads_by_stage = dict(stage_result.all())

    conversion_rate = (closed_won / total_leads * 100) if total_leads else 0.0

    return DashboardStats(
        total_conversations=total_conv or 0,
        active_conversations=active_conv or 0,
        total_leads=total_leads or 0,
        qualified_leads=qualified_leads or 0,
        closed_won=closed_won or 0,
        conversion_rate=round(conversion_rate, 2),
        avg_qualification_score=round(float(avg_score or 0), 2),
        conversations_by_channel=conv_by_channel,
        leads_by_stage=leads_by_stage,
    )


@router.get("/conversations/trend")
async def conversations_trend(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tendencia de conversaciones por día."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(Conversation.started_at).label("date"),
            func.count(Conversation.id).label("count"),
        )
        .where(Conversation.business_id == current_user.business_id, Conversation.started_at >= since)
        .group_by(func.date(Conversation.started_at))
        .order_by(func.date(Conversation.started_at))
    )
    return [{"date": str(row.date), "count": row.count} for row in result.all()]


@router.get("/agents/performance")
async def agent_performance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Performance por tipo de agente."""
    result = await db.execute(
        select(Message.agent_type, func.count(Message.id).label("messages"))
        .join(Conversation, Message.conversation_id == Conversation.id)
        .where(
            Conversation.business_id == current_user.business_id,
            Message.agent_type.isnot(None),
        )
        .group_by(Message.agent_type)
    )
    return [{"agent": row.agent_type, "messages": row.messages} for row in result.all()]


@router.get("/leads/funnel")
async def leads_funnel(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Funnel de leads por etapa en el período."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Lead.stage, func.count(Lead.id).label("count"))
        .where(
            Lead.business_id == current_user.business_id,
            Lead.created_at >= since,
        )
        .group_by(Lead.stage)
    )
    order = ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]
    data = {row.stage.value if hasattr(row.stage, "value") else row.stage: row.count
            for row in result.all()}
    return [{"stage": s, "count": data.get(s, 0)} for s in order]


@router.get("/leads/score-distribution")
async def score_distribution(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Distribución de scores BANT en buckets 0-2, 3-4, 5-6, 7-8, 9-10."""
    bid = current_user.business_id
    buckets = [
        ("Sin calificar", 0, 0),
        ("Frío (1-2)",    1, 2),
        ("Tibio (3-4)",   3, 4),
        ("Medio (5-6)",   5, 6),
        ("Calificado (7-8)", 7, 8),
        ("Hot (9-10)",    9, 10),
    ]
    result = []
    for label, low, high in buckets:
        if low == 0 and high == 0:
            count = await db.scalar(
                select(func.count(Lead.id)).where(
                    Lead.business_id == bid,
                    Lead.qualification_score.is_(None),
                )
            )
        else:
            count = await db.scalar(
                select(func.count(Lead.id)).where(
                    Lead.business_id == bid,
                    Lead.qualification_score >= low,
                    Lead.qualification_score <= high,
                )
            )
        result.append({"bucket": label, "count": count or 0})
    return result


@router.get("/conversations/by-channel-trend")
async def channel_trend(
    days: int = Query(30, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tendencia por canal en el período."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(Conversation.started_at).label("date"),
            Conversation.channel,
            func.count(Conversation.id).label("count"),
        )
        .where(
            Conversation.business_id == current_user.business_id,
            Conversation.started_at >= since,
        )
        .group_by(func.date(Conversation.started_at), Conversation.channel)
        .order_by(func.date(Conversation.started_at))
    )
    rows = result.all()
    # Collect all dates
    dates: set[str] = {str(r.date) for r in rows}
    channels = ["whatsapp", "webchat", "instagram"]
    data: dict[str, dict] = {}
    for r in rows:
        d = str(r.date)
        ch = r.channel.value if hasattr(r.channel, "value") else str(r.channel)
        if d not in data:
            data[d] = {"date": d}
        data[d][ch] = r.count
    return sorted(data.values(), key=lambda x: x["date"])


# ── Export CSV ─────────────────────────────────────────────────────────────

@router.get("/export/leads")
async def export_leads_csv(
    days: int = Query(90, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exporta leads como CSV descargable."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Lead)
        .where(
            Lead.business_id == current_user.business_id,
            Lead.created_at >= since,
        )
        .order_by(Lead.created_at.desc())
    )
    leads = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Nombre", "Email", "Teléfono", "Canal",
        "Etapa", "Score BANT", "Budget", "Authority", "Need", "Timeline",
        "Agente asignado", "Creado",
    ])
    for l in leads:
        writer.writerow([
            l.id,
            l.name or "",
            l.email or "",
            l.phone or "",
            l.channel or "",
            l.stage.value if hasattr(l.stage, "value") else (l.stage or ""),
            l.qualification_score or "",
            l.budget or "",
            l.authority or "",
            l.need or "",
            l.timeline or "",
            l.assigned_agent_type or "",
            l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else "",
        ])

    output.seek(0)
    filename = f"leads_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/conversations")
async def export_conversations_csv(
    days: int = Query(90, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Exporta conversaciones como CSV descargable."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.business_id == current_user.business_id,
            Conversation.started_at >= since,
        )
        .order_by(Conversation.started_at.desc())
    )
    convs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Canal", "Estado", "Agente actual",
        "Takeover humano", "Total mensajes", "Iniciado",
    ])
    for c in convs:
        writer.writerow([
            c.id,
            c.channel.value if hasattr(c.channel, "value") else (c.channel or ""),
            c.status.value if hasattr(c.status, "value") else (c.status or ""),
            c.current_agent or "",
            "Sí" if c.is_human_takeover else "No",
            0,  # message count — skip join for performance
            c.started_at.strftime("%Y-%m-%d %H:%M") if c.started_at else "",
        ])

    output.seek(0)
    filename = f"conversations_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
