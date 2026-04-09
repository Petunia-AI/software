"""add meta_page_token, messenger_enabled, messenger channel

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-03 01:00:00.000000

- Agrega meta_page_token (Page Access Token por negocio para IG DMs + Messenger)
- Agrega messenger_enabled a businesses
- Agrega valor 'messenger' al enum de canal de conversaciones
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agrega nuevo valor al enum Channel (PostgreSQL lo permite con IF NOT EXISTS)
    op.execute("ALTER TYPE channel ADD VALUE IF NOT EXISTS 'messenger'")

    op.add_column(
        "businesses",
        sa.Column("meta_page_token", sa.String(1000), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("messenger_enabled", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("businesses", "messenger_enabled")
    op.drop_column("businesses", "meta_page_token")
    # PostgreSQL no soporta DROP VALUE de un enum — dejar el valor
