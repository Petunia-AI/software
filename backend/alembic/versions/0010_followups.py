"""followups and lead_activities tables

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    # ── lead_activities ──────────────────────────────────────────────────────
    op.create_table(
        "lead_activities",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("lead_id", sa.String(), sa.ForeignKey("leads.id"), nullable=False),
        sa.Column("activity_type", sa.String(50), nullable=False, server_default="note"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("outcome", sa.String(50), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(100), nullable=False, server_default="manual"),
        sa.Column("is_ai_generated", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_lead_activities_business_id", "lead_activities", ["business_id"])
    op.create_index("ix_lead_activities_lead_id", "lead_activities", ["lead_id"])
    op.create_index("ix_lead_activities_created_at", "lead_activities", ["created_at"])

    # ── followups ────────────────────────────────────────────────────────────
    op.create_table(
        "followups",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("lead_id", sa.String(), sa.ForeignKey("leads.id"), nullable=False),
        sa.Column("followup_type", sa.String(50), nullable=False, server_default="call"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_to", sa.String(100), nullable=False, server_default="ai"),
        sa.Column("is_ai_generated", sa.Boolean(), server_default="false"),
        sa.Column("notify_email", sa.Boolean(), server_default="true"),
        sa.Column("notify_whatsapp", sa.Boolean(), server_default="false"),
        sa.Column("notification_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reminder_count", sa.Integer(), server_default="0"),
        sa.Column("created_by", sa.String(100), nullable=False, server_default="manual"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_followups_business_id", "followups", ["business_id"])
    op.create_index("ix_followups_lead_id", "followups", ["lead_id"])
    op.create_index("ix_followups_status", "followups", ["status"])
    op.create_index("ix_followups_scheduled_at", "followups", ["scheduled_at"])


def downgrade():
    op.drop_table("followups")
    op.drop_table("lead_activities")
