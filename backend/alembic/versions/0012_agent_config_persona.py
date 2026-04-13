"""agent_configs: add persona and config columns, property_listing content type

Revision ID: 0012
Revises: 0011
Create Date: 2026-04-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── agent_configs: add missing persona + config columns ─────────────────
    op.add_column("agent_configs", sa.Column("persona_name", sa.String(100), nullable=True))
    op.add_column("agent_configs", sa.Column("persona_tone", sa.String(50), nullable=True, server_default="professional"))
    op.add_column("agent_configs", sa.Column("language", sa.String(10), nullable=True, server_default="es"))
    op.add_column("agent_configs", sa.Column("system_prompt_override", sa.Text(), nullable=True))
    op.add_column("agent_configs", sa.Column("temperature", sa.Float(), nullable=True, server_default="0.7"))
    op.add_column("agent_configs", sa.Column("max_tokens", sa.String(10), nullable=True, server_default="1024"))
    op.add_column("agent_configs", sa.Column("handoff_score_threshold", sa.Float(), nullable=True, server_default="7.0"))
    op.add_column("agent_configs", sa.Column("working_hours", sa.JSON(), nullable=True))
    op.add_column("agent_configs", sa.Column("auto_reply_outside_hours", sa.Boolean(), nullable=True, server_default="true"))
    op.add_column("agent_configs", sa.Column("outside_hours_message", sa.Text(), nullable=True))

    # ── contenttype enum: add property_listing value ─────────────────────────
    # PostgreSQL requires ALTER TYPE to add enum values
    op.execute(sa.text("ALTER TYPE contenttype ADD VALUE IF NOT EXISTS 'property_listing'"))


def downgrade() -> None:
    op.drop_column("agent_configs", "outside_hours_message")
    op.drop_column("agent_configs", "auto_reply_outside_hours")
    op.drop_column("agent_configs", "working_hours")
    op.drop_column("agent_configs", "handoff_score_threshold")
    op.drop_column("agent_configs", "max_tokens")
    op.drop_column("agent_configs", "temperature")
    op.drop_column("agent_configs", "system_prompt_override")
    op.drop_column("agent_configs", "language")
    op.drop_column("agent_configs", "persona_tone")
    op.drop_column("agent_configs", "persona_name")
    # Note: PostgreSQL does not support removing enum values without recreating the type
