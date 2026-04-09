"""add social_posts table

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-30 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "social_posts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("channel", sa.Enum("instagram", "facebook", "linkedin", "twitter", name="contentchannel"), nullable=False),
        sa.Column("content_type", sa.Enum("educational", "testimonial", "product", "engagement", "trend", "behind_scenes", name="contenttype"), default="educational"),
        sa.Column("status", sa.Enum("draft", "approved", "scheduled", "published", "failed", name="contentstatus"), default="draft"),
        sa.Column("hook", sa.Text(), nullable=True),
        sa.Column("caption", sa.Text(), nullable=False),
        sa.Column("hashtags", sa.JSON(), nullable=True),
        sa.Column("image_prompt", sa.Text(), nullable=True),
        sa.Column("image_url", sa.String(1000), nullable=True),
        sa.Column("platform_post_id", sa.String(255), nullable=True),
        sa.Column("platform_url", sa.String(1000), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ai_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_social_posts_business_id", "social_posts", ["business_id"])
    op.create_index("ix_social_posts_status", "social_posts", ["status"])
    op.create_index("ix_social_posts_scheduled_at", "social_posts", ["scheduled_at"])


def downgrade() -> None:
    op.drop_index("ix_social_posts_scheduled_at", table_name="social_posts")
    op.drop_index("ix_social_posts_status", table_name="social_posts")
    op.drop_index("ix_social_posts_business_id", table_name="social_posts")
    op.drop_table("social_posts")
    op.execute("DROP TYPE IF EXISTS contentchannel")
    op.execute("DROP TYPE IF EXISTS contenttype")
    op.execute("DROP TYPE IF EXISTS contentstatus")
