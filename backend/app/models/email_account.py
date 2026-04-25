from sqlalchemy import String, Text, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # gmail | outlook | imap
    email_address: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=True)

    # OAuth tokens (Fernet encrypted)
    access_token_enc: Mapped[str] = mapped_column(Text, nullable=True)
    refresh_token_enc: Mapped[str] = mapped_column(Text, nullable=True)
    token_expires_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=True)

    # IMAP / SMTP credentials
    imap_host: Mapped[str] = mapped_column(String(255), nullable=True)
    imap_port: Mapped[int] = mapped_column(Integer, nullable=True)
    smtp_host: Mapped[str] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[int] = mapped_column(Integer, nullable=True)
    smtp_use_tls: Mapped[bool] = mapped_column(Boolean, default=True)
    password_enc: Mapped[str] = mapped_column(Text, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_synced_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_error: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    emails: Mapped[list["Email"]] = relationship("Email", back_populates="account", cascade="all, delete-orphan")


class Email(Base):
    __tablename__ = "emails"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    email_account_id: Mapped[str] = mapped_column(String, ForeignKey("email_accounts.id", ondelete="CASCADE"), nullable=False)
    lead_id: Mapped[str] = mapped_column(String, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)

    external_message_id: Mapped[str] = mapped_column(String(500), nullable=True)
    thread_id: Mapped[str] = mapped_column(String(500), nullable=True, index=True)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # inbound | outbound
    from_email: Mapped[str] = mapped_column(String(255), nullable=False)
    from_name: Mapped[str] = mapped_column(String(255), nullable=True)
    to_emails: Mapped[list] = mapped_column(JSON, default=list)
    cc_emails: Mapped[list] = mapped_column(JSON, default=list)
    subject: Mapped[str] = mapped_column(String(1000), nullable=True)
    body_html: Mapped[str] = mapped_column(Text, nullable=True)
    body_text: Mapped[str] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    account: Mapped["EmailAccount"] = relationship("EmailAccount", back_populates="emails")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(1000), nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
