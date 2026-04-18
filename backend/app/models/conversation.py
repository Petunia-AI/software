from sqlalchemy import String, Text, Float, JSON, DateTime, Boolean, ForeignKey, Enum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum


class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    WAITING = "waiting"
    RESOLVED = "resolved"
    ESCALATED = "escalated"


class Channel(str, enum.Enum):
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    MESSENGER = "messenger"
    WEBCHAT = "webchat"
    EMAIL = "email"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    TWITTER = "twitter"
    YOUTUBE = "youtube"
    FACEBOOK = "facebook"   # comentarios en página de Facebook (distinto de Messenger DMs)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id"), nullable=False)
    lead_id: Mapped[str] = mapped_column(String, ForeignKey("leads.id"), nullable=True)

    # Canal y estado
    channel: Mapped[str] = mapped_column(Enum(Channel, name="channel"), default=Channel.WEBCHAT)
    status: Mapped[str] = mapped_column(Enum(ConversationStatus, name="conversationstatus"), default=ConversationStatus.ACTIVE)

    # Agente activo
    current_agent: Mapped[str] = mapped_column(String(50), default="qualifier")

    # Identidad del contacto en el canal
    channel_contact_id: Mapped[str] = mapped_column(String(255), nullable=True, index=True)

    # Contexto y memoria
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    sentiment_score: Mapped[float] = mapped_column(Float, nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0)

    # Escalamiento a humano
    is_human_takeover: Mapped[bool] = mapped_column(Boolean, default=False)
    human_agent_name: Mapped[str] = mapped_column(String(255), nullable=True)

    # Metadata
    extra_data: Mapped[dict] = mapped_column(JSON, default=dict)

    started_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_message_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="conversations")
    lead: Mapped["Lead"] = relationship("Lead", back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="conversation", order_by="Message.created_at")
