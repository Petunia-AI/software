"""email_integration: email_accounts, emails, email_templates

Revision ID: 0022
Revises: 0021
Create Date: 2026-04-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── email_accounts ────────────────────────────────────────────────────
    op.create_table(
        "email_accounts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),  # gmail | outlook | imap
        sa.Column("email_address", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=True),
        # OAuth tokens (AES-256 encrypted via Fernet)
        sa.Column("access_token_enc", sa.Text(), nullable=True),
        sa.Column("refresh_token_enc", sa.Text(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        # IMAP/SMTP credentials
        sa.Column("imap_host", sa.String(255), nullable=True),
        sa.Column("imap_port", sa.Integer(), nullable=True),
        sa.Column("smtp_host", sa.String(255), nullable=True),
        sa.Column("smtp_port", sa.Integer(), nullable=True),
        sa.Column("smtp_use_tls", sa.Boolean(), server_default="true"),
        sa.Column("password_enc", sa.Text(), nullable=True),  # encrypted
        # Status
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sync_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_accounts_business_id", "email_accounts", ["business_id"])

    # ── emails ────────────────────────────────────────────────────────────
    op.create_table(
        "emails",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email_account_id", sa.String(), sa.ForeignKey("email_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lead_id", sa.String(), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("external_message_id", sa.String(500), nullable=True),  # Message-ID header
        sa.Column("thread_id", sa.String(500), nullable=True),
        sa.Column("direction", sa.String(10), nullable=False),  # inbound | outbound
        sa.Column("from_email", sa.String(255), nullable=False),
        sa.Column("from_name", sa.String(255), nullable=True),
        sa.Column("to_emails", sa.JSON(), server_default="[]"),
        sa.Column("cc_emails", sa.JSON(), server_default="[]"),
        sa.Column("subject", sa.String(1000), nullable=True),
        sa.Column("body_html", sa.Text(), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default="false"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_emails_business_id", "emails", ["business_id"])
    op.create_index("ix_emails_lead_id", "emails", ["lead_id"])
    op.create_index("ix_emails_thread_id", "emails", ["thread_id"])
    op.create_index("ix_emails_direction_created", "emails", ["direction", "created_at"])

    # ── email_templates ───────────────────────────────────────────────────
    op.create_table(
        "email_templates",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("subject", sa.String(1000), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_templates_business_id", "email_templates", ["business_id"])


def downgrade() -> None:
    op.drop_table("email_templates")
    op.drop_table("emails")
    op.drop_table("email_accounts")
