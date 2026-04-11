from sqlalchemy import String, Text, Float, Integer, JSON, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum


class LeadStage(str, enum.Enum):
    NEW = "new"
    QUALIFYING = "qualifying"
    QUALIFIED = "qualified"
    NURTURING = "nurturing"
    DEMO_SCHEDULED = "demo_scheduled"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATING = "negotiating"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class LeadSource(str, enum.Enum):
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    WEBCHAT = "webchat"
    MANUAL = "manual"
    REFERRAL = "referral"


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id"), nullable=False)

    # Datos personales
    name: Mapped[str] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str] = mapped_column(String(30), nullable=True, index=True)
    company: Mapped[str] = mapped_column(String(255), nullable=True)
    position: Mapped[str] = mapped_column(String(255), nullable=True)

    # Calificación BANT
    budget: Mapped[str] = mapped_column(Text, nullable=True)
    authority: Mapped[str] = mapped_column(Text, nullable=True)
    need: Mapped[str] = mapped_column(Text, nullable=True)
    timeline: Mapped[str] = mapped_column(Text, nullable=True)
    qualification_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Estado y fuente
    stage: Mapped[str] = mapped_column(String(50), default="new")
    source: Mapped[str] = mapped_column(String(100), default="webchat")

    # Metadatos
    tags: Mapped[dict] = mapped_column(JSON, default=list)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    assigned_agent_type: Mapped[str] = mapped_column(String(50), default="qualifier")

    # Valor potencial
    estimated_value: Mapped[float] = mapped_column(Float, nullable=True)

    # Seguimiento
    last_contacted_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    next_followup_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="leads")
    conversations: Mapped[list["Conversation"]] = relationship("Conversation", back_populates="lead")
    activities: Mapped[list["LeadActivity"]] = relationship("LeadActivity", back_populates="lead", order_by="desc(LeadActivity.created_at)")
    followups: Mapped[list["FollowUp"]] = relationship("FollowUp", back_populates="lead", order_by="FollowUp.scheduled_at")
