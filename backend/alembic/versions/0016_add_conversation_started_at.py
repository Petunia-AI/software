"""add started_at to conversations

Revision ID: 0016
Revises: 0015
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade():
    # Add started_at column — defaults to the existing created_at value so
    # historical rows get a sensible timestamp instead of NULL.
    op.add_column(
        "conversations",
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    # Backfill existing rows with created_at (both columns have the same data)
    op.execute(
        "UPDATE conversations SET started_at = created_at WHERE started_at IS NULL"
    )


def downgrade():
    op.drop_column("conversations", "started_at")
