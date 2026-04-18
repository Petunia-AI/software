"""add ayrshare autoresponder + twitter/youtube/facebook channel enum values

Revision ID: 0020
Revises: 0019
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def _column_exists(conn, table, column):
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name=:t AND column_name=:c"
    ), {"t": table, "c": column})
    return result.fetchone() is not None


def _enum_value_exists(conn, enum_name, value):
    result = conn.execute(sa.text(
        "SELECT 1 FROM pg_enum pe "
        "JOIN pg_type pt ON pe.enumtypid = pt.oid "
        "WHERE pt.typname=:enum AND pe.enumlabel=:val"
    ), {"enum": enum_name, "val": value})
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()

    # Nuevos valores del enum channel
    for val in ("twitter", "youtube", "facebook"):
        if not _enum_value_exists(conn, "channel", val):
            conn.execute(sa.text(f"ALTER TYPE channel ADD VALUE '{val}'"))

    # Campo autoresponder en businesses
    if not _column_exists(conn, "businesses", "ayrshare_autoresponder_enabled"):
        op.add_column(
            "businesses",
            sa.Column("ayrshare_autoresponder_enabled", sa.Boolean(), nullable=True),
        )
        conn.execute(sa.text(
            "UPDATE businesses SET ayrshare_autoresponder_enabled = false "
            "WHERE ayrshare_autoresponder_enabled IS NULL"
        ))


def downgrade() -> None:
    op.drop_column("businesses", "ayrshare_autoresponder_enabled")
    # No se pueden quitar valores de enum PostgreSQL sin recrear el tipo
