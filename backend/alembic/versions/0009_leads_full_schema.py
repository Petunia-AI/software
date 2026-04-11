"""leads full schema

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-10

"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to leads table
    op.add_column("leads", sa.Column("company", sa.String(255), nullable=True))
    op.add_column("leads", sa.Column("position", sa.String(255), nullable=True))
    op.add_column("leads", sa.Column("budget", sa.Text(), nullable=True))
    op.add_column("leads", sa.Column("authority", sa.Text(), nullable=True))
    op.add_column("leads", sa.Column("need", sa.Text(), nullable=True))
    op.add_column("leads", sa.Column("timeline", sa.Text(), nullable=True))
    op.add_column("leads", sa.Column("qualification_score", sa.Float(), nullable=True, server_default=sa.text("0.0")))
    op.add_column("leads", sa.Column("tags", sa.JSON(), nullable=True))
    op.add_column("leads", sa.Column("assigned_agent_type", sa.String(50), nullable=True, server_default=sa.text("'qualifier'")))
    op.add_column("leads", sa.Column("estimated_value", sa.Float(), nullable=True))
    op.add_column("leads", sa.Column("last_contacted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("next_followup_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")))


def downgrade() -> None:
    op.drop_column("leads", "is_active")
    op.drop_column("leads", "next_followup_at")
    op.drop_column("leads", "last_contacted_at")
    op.drop_column("leads", "estimated_value")
    op.drop_column("leads", "assigned_agent_type")
    op.drop_column("leads", "tags")
    op.drop_column("leads", "qualification_score")
    op.drop_column("leads", "timeline")
    op.drop_column("leads", "need")
    op.drop_column("leads", "authority")
    op.drop_column("leads", "budget")
    op.drop_column("leads", "position")
    op.drop_column("leads", "company")
