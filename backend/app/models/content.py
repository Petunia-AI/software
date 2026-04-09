import uuid
import enum
from sqlalchemy import String, Text, JSON, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class ContentChannel(str, enum.Enum):
    instagram = "instagram"
    facebook  = "facebook"
    linkedin  = "linkedin"
    twitter   = "twitter"
    tiktok    = "tiktok"


class ContentFormat(str, enum.Enum):
    post  = "post"    # Cuadrado/landscape — 1:1 o 4:5
    story = "story"   # Vertical — 9:16
    reel  = "reel"    # Vertical video — 9:16 (solo Premium con HeyGen o video propio)


class ContentStatus(str, enum.Enum):
    draft      = "draft"       # generado, pendiente de revisión
    approved   = "approved"    # aprobado por el usuario
    scheduled  = "scheduled"   # programado para publicar
    published  = "published"   # publicado exitosamente
    failed     = "failed"      # error al publicar


class ContentType(str, enum.Enum):
    educational  = "educational"
    testimonial  = "testimonial"
    product      = "product"
    engagement   = "engagement"
    trend        = "trend"
    behind_scenes = "behind_scenes"


class SocialPost(Base):
    __tablename__ = "social_posts"

    id:          Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id"), nullable=False)

    channel:      Mapped[ContentChannel] = mapped_column(SAEnum(ContentChannel), nullable=False)
    content_type: Mapped[ContentType]    = mapped_column(SAEnum(ContentType), default=ContentType.educational)
    format_type:  Mapped[str]            = mapped_column(String(20), default="post", nullable=False, server_default="post")
    status:       Mapped[ContentStatus]  = mapped_column(SAEnum(ContentStatus), default=ContentStatus.draft)

    # Contenido generado
    hook:          Mapped[str] = mapped_column(Text, nullable=True)
    caption:       Mapped[str] = mapped_column(Text, nullable=False)
    hashtags:      Mapped[dict] = mapped_column(JSON, default=list)
    image_prompt:  Mapped[str] = mapped_column(Text, nullable=True)   # prompt para generación de imagen
    image_url:     Mapped[str] = mapped_column(String(2000), nullable=True)  # URL de imagen generada/subida

    # Video (solo plan Premium con HeyGen)
    video_url:     Mapped[str] = mapped_column(String(2000), nullable=True)  # URL del video generado
    video_job_id:  Mapped[str] = mapped_column(String(255), nullable=True)   # ID de trabajo en HeyGen

    # Animación sugerida para el frontend
    animation_style: Mapped[str] = mapped_column(String(50), nullable=True)  # fade-in, slide-up, zoom-in, etc.

    # Metadata de publicación
    platform_post_id: Mapped[str] = mapped_column(String(255), nullable=True)  # ID del post en la red social
    platform_url:     Mapped[str] = mapped_column(String(1000), nullable=True)  # URL pública del post
    error_message:    Mapped[str] = mapped_column(Text, nullable=True)

    # Programación
    scheduled_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    # IA metadata
    ai_metadata: Mapped[dict] = mapped_column(JSON, default=dict)  # estimated_reach, best_time, etc.

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    business: Mapped["Business"] = relationship("Business")  # type: ignore
