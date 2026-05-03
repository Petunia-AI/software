"""add email campaigns and sequences tables

Revision ID: 0028
Revises: 0027
Create Date: 2026-05-03
"""
from alembic import op
import sqlalchemy as sa

revision = "0028"
down_revision = "0027"
branch_labels = None
depends_on = None


def upgrade():
    # ── email_campaigns ───────────────────────────────────────────────────────
    op.create_table(
        "email_campaigns",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("business_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        # draft | scheduled | sending | sent | paused
        sa.Column("from_name", sa.String(), nullable=True),
        sa.Column("from_email", sa.String(), nullable=True),
        sa.Column("reply_to", sa.String(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        # stats (updated via SendGrid webhooks)
        sa.Column("total_sent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_opened", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_clicked", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_bounced", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_unsubscribed", sa.Integer(), nullable=False, server_default="0"),
        # audience filter (JSON): {"stage": "nuevo", "source": "web", ...} or null = all leads
        sa.Column("audience_filter", sa.Text(), nullable=True),
        sa.Column("sendgrid_batch_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_campaigns_business_id", "email_campaigns", ["business_id"])
    op.create_index("ix_email_campaigns_status", "email_campaigns", ["status"])

    # ── email_sequences ───────────────────────────────────────────────────────
    op.create_table(
        "email_sequences",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("business_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("trigger", sa.String(), nullable=False, server_default="manual"),
        # manual | lead_created | lead_stage_changed | no_reply_days
        sa.Column("trigger_config", sa.Text(), nullable=True),  # JSON
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("from_name", sa.String(), nullable=True),
        sa.Column("from_email", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_sequences_business_id", "email_sequences", ["business_id"])

    # ── email_sequence_steps ──────────────────────────────────────────────────
    op.create_table(
        "email_sequence_steps",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("sequence_id", sa.String(), nullable=False),
        sa.Column("step_number", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("delay_hours", sa.Integer(), nullable=False, server_default="24"),
        # hours after previous step (or enrollment for step 1)
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["sequence_id"], ["email_sequences.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_email_sequence_steps_sequence_id", "email_sequence_steps", ["sequence_id"])

    # ── email_sequence_enrollments ────────────────────────────────────────────
    op.create_table(
        "email_sequence_enrollments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("sequence_id", sa.String(), nullable=False),
        sa.Column("lead_id", sa.String(), nullable=False),
        sa.Column("business_id", sa.String(), nullable=False),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        # active | completed | paused | unsubscribed
        sa.Column("next_send_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["sequence_id"], ["email_sequences.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("sequence_id", "lead_id", name="uq_enrollment_sequence_lead"),
    )
    op.create_index("ix_email_sequence_enrollments_business_id", "email_sequence_enrollments", ["business_id"])
    op.create_index("ix_email_sequence_enrollments_next_send", "email_sequence_enrollments", ["next_send_at"])
    op.create_index("ix_email_sequence_enrollments_status", "email_sequence_enrollments", ["status"])

    # ── email_sends (log of every individual email sent) ─────────────────────
    op.create_table(
        "email_sends",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("business_id", sa.String(), nullable=False),
        sa.Column("campaign_id", sa.String(), nullable=True),
        sa.Column("sequence_id", sa.String(), nullable=True),
        sa.Column("step_id", sa.String(), nullable=True),
        sa.Column("lead_id", sa.String(), nullable=True),
        sa.Column("to_email", sa.String(), nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("sendgrid_message_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="sent"),
        # sent | delivered | opened | clicked | bounced | spam | unsubscribed
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("clicked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bounced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_sends_business_id", "email_sends", ["business_id"])
    op.create_index("ix_email_sends_campaign_id", "email_sends", ["campaign_id"])
    op.create_index("ix_email_sends_lead_id", "email_sends", ["lead_id"])
    op.create_index("ix_email_sends_sendgrid_message_id", "email_sends", ["sendgrid_message_id"])


def downgrade():
    op.drop_table("email_sends")
    op.drop_table("email_sequence_enrollments")
    op.drop_table("email_sequence_steps")
    op.drop_table("email_sequences")
    op.drop_table("email_campaigns")
