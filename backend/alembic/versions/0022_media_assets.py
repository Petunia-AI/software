"""
add media_assets table

Revision ID: 0022
Revises: 0021
Create Date: 2026-04-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def _table_exists(conn, table: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_name = :t"
    ), {"t": table})
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if not _table_exists(conn, "media_assets"):
        op.create_table(
            "media_assets",
            sa.Column("id", sa.String(), primary_key=True, nullable=False),
            sa.Column("business_id", sa.String(), sa.ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False),
            sa.Column("original_filename", sa.String(512), nullable=False),
            sa.Column("stored_filename", sa.String(512), nullable=False),
            sa.Column("mime_type", sa.String(128), nullable=False),
            sa.Column("file_type", sa.String(16), nullable=False),
            sa.Column("file_size_bytes", sa.Integer(), nullable=False),
            sa.Column("storage_path", sa.String(1024), nullable=False),
            sa.Column("public_url", sa.String(2048), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("ix_media_assets_business_id", "media_assets", ["business_id"])


def downgrade() -> None:
    op.drop_index("ix_media_assets_business_id", "media_assets")
    op.drop_table("media_assets")
