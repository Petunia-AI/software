"""Email Campaign & Sequence models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    business_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    from_name: Mapped[str | None] = mapped_column(String, nullable=True)
    from_email: Mapped[str | None] = mapped_column(String, nullable=True)
    reply_to: Mapped[str | None] = mapped_column(String, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_sent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_opened: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_clicked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_bounced: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_unsubscribed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    audience_filter: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    sendgrid_batch_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)

    sends: Mapped[list["EmailSend"]] = relationship(
        "EmailSend", foreign_keys="EmailSend.campaign_id", back_populates="campaign", lazy="select"
    )


class EmailSequence(Base):
    __tablename__ = "email_sequences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    business_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    trigger: Mapped[str] = mapped_column(String, nullable=False, default="manual")
    trigger_config: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    from_name: Mapped[str | None] = mapped_column(String, nullable=True)
    from_email: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now, onupdate=_now)

    steps: Mapped[list["EmailSequenceStep"]] = relationship(
        "EmailSequenceStep", back_populates="sequence", cascade="all, delete-orphan",
        order_by="EmailSequenceStep.step_number",
    )
    enrollments: Mapped[list["EmailSequenceEnrollment"]] = relationship(
        "EmailSequenceEnrollment", back_populates="sequence", cascade="all, delete-orphan",
    )


class EmailSequenceStep(Base):
    __tablename__ = "email_sequence_steps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    sequence_id: Mapped[str] = mapped_column(
        String, ForeignKey("email_sequences.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    delay_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=24)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)

    sequence: Mapped["EmailSequence"] = relationship("EmailSequence", back_populates="steps")


class EmailSequenceEnrollment(Base):
    __tablename__ = "email_sequence_enrollments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    sequence_id: Mapped[str] = mapped_column(
        String, ForeignKey("email_sequences.id", ondelete="CASCADE"), nullable=False
    )
    lead_id: Mapped[str] = mapped_column(String, nullable=False)
    business_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    next_send_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (UniqueConstraint("sequence_id", "lead_id", name="uq_enrollment_sequence_lead"),)

    sequence: Mapped["EmailSequence"] = relationship("EmailSequence", back_populates="enrollments")


class EmailSend(Base):
    __tablename__ = "email_sends"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    business_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    campaign_id: Mapped[str | None] = mapped_column(String, ForeignKey("email_campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    sequence_id: Mapped[str | None] = mapped_column(String, nullable=True)
    step_id: Mapped[str | None] = mapped_column(String, nullable=True)
    lead_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    to_email: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    sendgrid_message_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="sent")
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    clicked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    bounced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)

    campaign: Mapped["EmailCampaign | None"] = relationship("EmailCampaign", foreign_keys=[campaign_id], back_populates="sends")
