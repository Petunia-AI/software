"""add ayrshare_autoresponder_channels to businesses

Revision ID: 0021
Revises: 0020
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def _column_exists(conn, table, column):
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name=:t AND column_name=:c"
    ), {"t": table, "c": column})
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if not _column_exists(conn, "businesses", "ayrshare_autoresponder_channels"):
        op.add_column(
            "businesses",
            sa.Column("ayrshare_autoresponder_channels", sa.JSON(), nullable=True),
        )
        conn.execute(sa.text(
            "UPDATE businesses SET ayrshare_autoresponder_channels = '[]'::jsonb "
            "WHERE ayrshare_autoresponder_channels IS NULL"
        ))


def downgrade() -> None:
    op.drop_column("businesses", "ayrshare_autoresponder_channels")
