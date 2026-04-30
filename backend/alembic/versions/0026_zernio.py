"""rename ayrshare columns to zernio

Revision ID: 0026
Revises: 0025
Create Date: 2026-04-30
"""
from alembic import op
import sqlalchemy as sa


revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name=:t AND column_name=:c"
        ),
        {"t": table, "c": column},
    )
    return result.fetchone() is not None


def upgrade():
    conn = op.get_bind()

    renames = [
        ("ayrshare_profile_key",         "zernio_profile_id"),
        ("ayrshare_ref_id",              "zernio_ref_id"),
        ("ayrshare_connected_platforms", "zernio_connected_platforms"),
        ("ayrshare_enabled",             "zernio_enabled"),
        ("ayrshare_autoresponder_enabled",  "zernio_autoresponder_enabled"),
        ("ayrshare_autoresponder_channels", "zernio_autoresponder_channels"),
    ]

    for old, new in renames:
        if _column_exists(conn, "businesses", old) and not _column_exists(conn, "businesses", new):
            op.alter_column("businesses", old, new_column_name=new)


def downgrade():
    conn = op.get_bind()

    renames = [
        ("zernio_profile_id",            "ayrshare_profile_key"),
        ("zernio_ref_id",                "ayrshare_ref_id"),
        ("zernio_connected_platforms",   "ayrshare_connected_platforms"),
        ("zernio_enabled",               "ayrshare_enabled"),
        ("zernio_autoresponder_enabled",  "ayrshare_autoresponder_enabled"),
        ("zernio_autoresponder_channels", "ayrshare_autoresponder_channels"),
    ]

    for old, new in renames:
        conn_check = op.get_bind()
        if _column_exists(conn_check, "businesses", old) and not _column_exists(conn_check, "businesses", new):
            op.alter_column("businesses", old, new_column_name=new)
