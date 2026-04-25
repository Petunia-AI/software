from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database import Base
import uuid


class CalendarAccount(Base):
    """Google Calendar or Zoom account connected per business."""
    __tablename__ = "calendar_accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # google | zoom
    email_or_user: Mapped[str] = mapped_column(String(255), nullable=True)  # google email or zoom user id
    display_name: Mapped[str] = mapped_column(String(255), nullable=True)

    # OAuth tokens (plain stored; encrypt in production via same Fernet util)
    access_token_enc: Mapped[str] = mapped_column(Text, nullable=True)
    refresh_token_enc: Mapped[str] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=True)
    zoom_account_id: Mapped[str] = mapped_column(String(255), nullable=True)  # Zoom specific

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Meeting(Base):
    """A scheduled meeting (Google Meet or Zoom)."""
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id: Mapped[str] = mapped_column(String, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    calendar_account_id: Mapped[str] = mapped_column(String, ForeignKey("calendar_accounts.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # google | zoom | manual
    status: Mapped[str] = mapped_column(String(20), default="scheduled")  # scheduled | completed | cancelled

    # Meeting details
    meeting_url: Mapped[str] = mapped_column(Text, nullable=True)      # Join URL
    meeting_id_ext: Mapped[str] = mapped_column(String(255), nullable=True)  # Google event ID or Zoom meeting ID
    calendar_event_id: Mapped[str] = mapped_column(String(255), nullable=True)

    start_time: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)

    # Attendees (comma-separated emails or JSON string)
    attendees_json: Mapped[str] = mapped_column(Text, nullable=True)  # JSON list of {email, name}

    # AI processing
    transcript_text: Mapped[str] = mapped_column(Text, nullable=True)   # Raw transcript pasted by user
    summary_text: Mapped[str] = mapped_column(Text, nullable=True)       # Gemini summary
    presentation_html: Mapped[str] = mapped_column(Text, nullable=True)  # Claude HTML presentation
    follow_up_email_html: Mapped[str] = mapped_column(Text, nullable=True)  # Claude follow-up email draft

    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
