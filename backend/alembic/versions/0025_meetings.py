"""add meetings and calendar_accounts tables

Revision ID: 0025
Revises: 0024
Create Date: 2026-04-25
"""
from alembic import op
import sqlalchemy as sa

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "calendar_accounts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("email_or_user", sa.String(255), nullable=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("access_token_enc", sa.Text(), nullable=True),
        sa.Column("refresh_token_enc", sa.Text(), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("zoom_account_id", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "meetings",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("lead_id", sa.String(), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("calendar_account_id", sa.String(), sa.ForeignKey("calendar_accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), default="scheduled"),
        sa.Column("meeting_url", sa.Text(), nullable=True),
        sa.Column("meeting_id_ext", sa.String(255), nullable=True),
        sa.Column("calendar_event_id", sa.String(255), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attendees_json", sa.Text(), nullable=True),
        sa.Column("transcript_text", sa.Text(), nullable=True),
        sa.Column("summary_text", sa.Text(), nullable=True),
        sa.Column("presentation_html", sa.Text(), nullable=True),
        sa.Column("follow_up_email_html", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("meetings")
    op.drop_table("calendar_accounts")
