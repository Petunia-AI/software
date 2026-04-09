"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── businesses ────────────────────────────────────────────
    op.create_table(
        "businesses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("industry", sa.String(100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("product_description", sa.Text(), nullable=True),
        sa.Column("pricing_info", sa.Text(), nullable=True),
        sa.Column("target_customer", sa.Text(), nullable=True),
        sa.Column("value_proposition", sa.Text(), nullable=True),
        sa.Column("objection_handling", sa.JSON(), nullable=True),
        sa.Column("faqs", sa.JSON(), nullable=True),
        sa.Column("whatsapp_enabled", sa.Boolean(), default=False),
        sa.Column("instagram_enabled", sa.Boolean(), default=False),
        sa.Column("webchat_enabled", sa.Boolean(), default=True),
        sa.Column("whatsapp_phone", sa.String(20), nullable=True),
        sa.Column("whatsapp_token", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── users ─────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("is_superuser", sa.Boolean(), default=False),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ── subscriptions ─────────────────────────────────────────
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id"), unique=True, nullable=False),
        sa.Column(
            "plan",
            sa.Enum("trial", "starter", "pro", "enterprise", name="plantier"),
            default="trial",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("trialing", "active", "past_due", "canceled", "paused", name="subscriptionstatus"),
            default="trialing",
            nullable=False,
        ),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("stripe_price_id", sa.String(255), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("conversations_this_period", sa.Integer(), default=0),
        sa.Column("leads_this_period", sa.Integer(), default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── leads ─────────────────────────────────────────────────
    op.create_table(
        "leads",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("source", sa.String(100), nullable=True),
        sa.Column("stage", sa.String(50), default="new"),
        sa.Column("score", sa.Integer(), default=0),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_leads_business_id", "leads", ["business_id"])

    # ── conversations ─────────────────────────────────────────
    op.create_table(
        "conversations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("lead_id", sa.String(), sa.ForeignKey("leads.id"), nullable=True),
        sa.Column("channel", sa.String(50), default="webchat"),
        sa.Column("status", sa.String(50), default="active"),
        sa.Column("visitor_name", sa.String(255), nullable=True),
        sa.Column("visitor_email", sa.String(255), nullable=True),
        sa.Column("visitor_phone", sa.String(50), nullable=True),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("human_takeover", sa.Boolean(), default=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_conversations_business_id", "conversations", ["business_id"])

    # ── messages ──────────────────────────────────────────────
    op.create_table(
        "messages",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("conversation_id", sa.String(), sa.ForeignKey("conversations.id"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),  # user | assistant | system
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("agent_type", sa.String(50), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])

    # ── agent_configs ─────────────────────────────────────────
    op.create_table(
        "agent_configs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("agent_type", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("system_prompt", sa.Text(), nullable=True),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("agent_configs")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("leads")
    op.drop_table("subscriptions")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("businesses")
    op.execute("DROP TYPE IF EXISTS plantier")
    op.execute("DROP TYPE IF EXISTS subscriptionstatus")
