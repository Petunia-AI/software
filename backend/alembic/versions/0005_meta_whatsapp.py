"""add meta whatsapp fields to businesses

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-03 00:00:00.000000

Agrega los campos necesarios para Meta WhatsApp Business Cloud API:
  - meta_phone_number_id: ID del número de teléfono en Meta
  - meta_wa_token: Token de acceso permanente (System User Token)
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "businesses",
        sa.Column("meta_phone_number_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "businesses",
        sa.Column("meta_wa_token", sa.String(1000), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("businesses", "meta_wa_token")
    op.drop_column("businesses", "meta_phone_number_id")
