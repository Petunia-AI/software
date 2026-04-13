"""add linkedin and tiktok fields + channel enum values

Revision ID: 0015
Revises: 0014
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0015"
down_revision = "0014"
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

    # ── Agregar valores al enum 'channel' ─────────────────────────────────────
    for val in ("linkedin", "tiktok"):
        if not _enum_value_exists(conn, "channel", val):
            conn.execute(sa.text(f"ALTER TYPE channel ADD VALUE '{val}'"))

    # ── Columnas LinkedIn en businesses ──────────────────────────────────────
    linkedin_columns = [
        ("linkedin_enabled",           sa.Boolean(),              "false"),
        ("linkedin_access_token",      sa.String(2000),           "NULL"),
        ("linkedin_refresh_token",     sa.String(2000),           "NULL"),
        ("linkedin_token_expires_at",  sa.DateTime(timezone=True), "NULL"),
        ("linkedin_org_id",            sa.String(100),            "NULL"),
        ("linkedin_person_urn",        sa.String(100),            "NULL"),
        ("linkedin_name",              sa.String(255),            "NULL"),
    ]
    for col_name, col_type, default in linkedin_columns:
        if not _column_exists(conn, "businesses", col_name):
            op.add_column("businesses", sa.Column(col_name, col_type, nullable=True))
            if default != "NULL":
                conn.execute(sa.text(
                    f"UPDATE businesses SET {col_name} = {default} WHERE {col_name} IS NULL"
                ))

    # ── Columnas TikTok en businesses ─────────────────────────────────────────
    tiktok_columns = [
        ("tiktok_enabled",           sa.Boolean(),              "false"),
        ("tiktok_access_token",      sa.String(2000),           "NULL"),
        ("tiktok_refresh_token",     sa.String(2000),           "NULL"),
        ("tiktok_token_expires_at",  sa.DateTime(timezone=True), "NULL"),
        ("tiktok_open_id",           sa.String(100),            "NULL"),
        ("tiktok_username",          sa.String(255),            "NULL"),
    ]
    for col_name, col_type, default in tiktok_columns:
        if not _column_exists(conn, "businesses", col_name):
            op.add_column("businesses", sa.Column(col_name, col_type, nullable=True))
            if default != "NULL":
                conn.execute(sa.text(
                    f"UPDATE businesses SET {col_name} = {default} WHERE {col_name} IS NULL"
                ))


def downgrade() -> None:
    for col in [
        "linkedin_enabled", "linkedin_access_token", "linkedin_refresh_token",
        "linkedin_token_expires_at", "linkedin_org_id", "linkedin_person_urn", "linkedin_name",
        "tiktok_enabled", "tiktok_access_token", "tiktok_refresh_token",
        "tiktok_token_expires_at", "tiktok_open_id", "tiktok_username",
    ]:
        op.drop_column("businesses", col)
    # Nota: no se puede quitar valores de un enum PostgreSQL fácilmente.
    # Se requeriría recrear el tipo si se necesita downgrade completo.
