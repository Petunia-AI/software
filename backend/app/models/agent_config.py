from sqlalchemy import String, Text, Float, JSON, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id"), nullable=False)

    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)  # qualifier, closer, nurturer, support
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Personalidad del agente
    persona_name: Mapped[str] = mapped_column(String(100), nullable=True)
    persona_tone: Mapped[str] = mapped_column(String(50), default="professional")  # friendly, professional, casual
    language: Mapped[str] = mapped_column(String(10), default="es")

    # Prompts personalizados
    system_prompt_override: Mapped[str] = mapped_column(Text, nullable=True)

    # Configuración
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    max_tokens: Mapped[int] = mapped_column(String(10), default=1024)
    handoff_score_threshold: Mapped[float] = mapped_column(Float, default=7.0)  # Score mínimo para pasar a Closer

    # Horario de atención
    working_hours: Mapped[dict] = mapped_column(JSON, default=dict)
    auto_reply_outside_hours: Mapped[bool] = mapped_column(Boolean, default=True)
    outside_hours_message: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    business: Mapped["Business"] = relationship("Business", back_populates="agent_configs")
