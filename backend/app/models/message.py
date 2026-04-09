from sqlalchemy import String, Text, Float, JSON, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(String, ForeignKey("conversations.id"), nullable=False, index=True)

    role: Mapped[str] = mapped_column(Enum(MessageRole, name="messagerole"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Agente que respondió
    agent_type: Mapped[str] = mapped_column(String(50), nullable=True)

    # Análisis
    sentiment: Mapped[float] = mapped_column(Float, nullable=True)
    intent: Mapped[str] = mapped_column(String(100), nullable=True)
    tokens_used: Mapped[int] = mapped_column(String(20), nullable=True)

    # Metadatos del canal
    channel_message_id: Mapped[str] = mapped_column(String(255), nullable=True)
    media_url: Mapped[str] = mapped_column(String(500), nullable=True)
    extra_data: Mapped[dict] = mapped_column(JSON, default=dict)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
