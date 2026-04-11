from sqlalchemy import String, Text, Float, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class LeadActivity(Base):
    """Registro de cualquier interacción/evento sobre un lead."""
    __tablename__ = "lead_activities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    lead_id: Mapped[str] = mapped_column(String, ForeignKey("leads.id"), nullable=False, index=True)

    # Tipo: call | email | whatsapp | meeting | note | stage_change | followup_completed | ai_action
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False, default="note")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Resultado de la actividad: contacted | no_answer | interested | not_interested | scheduled | other
    outcome: Mapped[str] = mapped_column(String(50), nullable=True)

    # Si fue una actividad programada, cuándo estaba planificada y cuándo se ejecutó
    scheduled_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Quién la creó: "ai" o user_id
    created_by: Mapped[str] = mapped_column(String(100), nullable=False, default="manual")
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="activities")  # type: ignore


class FollowUp(Base):
    """Seguimiento programado sobre un lead, con notificaciones y gestión IA/manual."""
    __tablename__ = "followups"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id"), nullable=False, index=True)
    lead_id: Mapped[str] = mapped_column(String, ForeignKey("leads.id"), nullable=False, index=True)

    # Tipo: call | email | whatsapp | meeting | task
    followup_type: Mapped[str] = mapped_column(String(50), nullable=False, default="call")

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Estado: pending | completed | cancelled | overdue
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending", index=True)

    # Prioridad: low | medium | high | urgent
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")

    scheduled_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    completed_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Asignado a: "ai" o user_id
    assigned_to: Mapped[str] = mapped_column(String(100), nullable=False, default="ai")
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    # Notificaciones
    notify_email: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_sent_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Cuántas veces se ha recordado (para evitar spam)
    reminder_count: Mapped[int] = mapped_column(Integer, default=0)

    created_by: Mapped[str] = mapped_column(String(100), nullable=False, default="manual")

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    lead: Mapped["Lead"] = relationship("Lead", back_populates="followups")  # type: ignore
