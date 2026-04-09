"""add instagram fields to businesses

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-30 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("instagram_account_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("instagram_page_id", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("businesses", "instagram_page_id")
    op.drop_column("businesses", "instagram_account_id")
