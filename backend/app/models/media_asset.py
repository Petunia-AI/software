"""
MediaAsset — archivos subidos por el usuario (imágenes y videos) para usar en posts.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database import Base


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_id: Mapped[str] = mapped_column(
        String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # File info
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    file_type: Mapped[str] = mapped_column(String(16), nullable=False)   # "image" | "video"
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    # Storage
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)  # relative path (local) or S3 key
    public_url: Mapped[str] = mapped_column(String(2048), nullable=False)    # publicly accessible URL

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
