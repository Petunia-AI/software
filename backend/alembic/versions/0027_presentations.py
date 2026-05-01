"""add presentations table

Revision ID: 0027
Revises: 0026
Create Date: 2026-05-01
"""
from alembic import op
import sqlalchemy as sa

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "presentations",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "business_id",
            sa.String(),
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("transcript_text", sa.Text(), nullable=True),
        sa.Column("style", sa.String(50), nullable=True, server_default="profesional"),
        sa.Column("presentation_html", sa.Text(), nullable=True),
        sa.Column("slide_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_presentations_business_id", "presentations", ["business_id"])


def downgrade():
    op.drop_index("ix_presentations_business_id", "presentations")
    op.drop_table("presentations")
