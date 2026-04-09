"""add meta OAuth fields to businesses

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-09

Agrega los campos necesarios para el flujo OAuth de Meta:
  - meta_connected        (bool)
  - meta_user_id          (str)
  - meta_user_name        (str)
  - meta_long_lived_token (str, 1000)
  - meta_token_expires_at (datetime tz-aware)
  - meta_pages            (JSON — lista de páginas con tokens, sin exponer en API)
  - meta_wa_business_id   (str)
  - meta_selected_page_id (str)
  - meta_selected_wa_phone_id (str)
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("meta_connected", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "businesses",
        sa.Column("meta_user_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("meta_user_name", sa.String(255), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("meta_long_lived_token", sa.String(1000), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("meta_token_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("meta_pages", sa.JSON(), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("meta_wa_business_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("meta_selected_page_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("meta_selected_wa_phone_id", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("businesses", "meta_selected_wa_phone_id")
    op.drop_column("businesses", "meta_selected_page_id")
    op.drop_column("businesses", "meta_wa_business_id")
    op.drop_column("businesses", "meta_pages")
    op.drop_column("businesses", "meta_token_expires_at")
    op.drop_column("businesses", "meta_long_lived_token")
    op.drop_column("businesses", "meta_user_name")
    op.drop_column("businesses", "meta_user_id")
    op.drop_column("businesses", "meta_connected")
