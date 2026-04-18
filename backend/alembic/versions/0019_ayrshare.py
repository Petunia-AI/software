"""add ayrshare fields to businesses

Revision ID: 0019
Revises: 0018
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0019"
down_revision = "0018"
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

    ayrshare_columns = [
        ("ayrshare_profile_key",         sa.String(500),  "NULL"),
        ("ayrshare_ref_id",              sa.String(255),  "NULL"),
        ("ayrshare_connected_platforms", sa.JSON(),       "NULL"),
        ("ayrshare_enabled",             sa.Boolean(),    "false"),
    ]
    for col_name, col_type, default in ayrshare_columns:
        if not _column_exists(conn, "businesses", col_name):
            op.add_column("businesses", sa.Column(col_name, col_type, nullable=True))
            if default != "NULL":
                conn.execute(sa.text(
                    f"UPDATE businesses SET {col_name} = {default} WHERE {col_name} IS NULL"
                ))


def downgrade() -> None:
    for col in [
        "ayrshare_profile_key",
        "ayrshare_ref_id",
        "ayrshare_connected_platforms",
        "ayrshare_enabled",
    ]:
        op.drop_column("businesses", col)
