"""Añade columnas faltantes a conversations usando SQL directo (evita el bug de op.get_bind con asyncpg)

Revision ID: 0017
Revises: 0016
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None

# Columnas que debería haber añadido 0014 + started_at de 0016
# Usamos ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+) para que sea idempotente
COLUMNS_SQL = [
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS current_agent       VARCHAR(50)  DEFAULT 'qualifier'",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_contact_id  VARCHAR(255)",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summary             TEXT",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sentiment_score     FLOAT",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_count       INTEGER      DEFAULT 0",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_human_takeover   BOOLEAN      DEFAULT false",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS human_agent_name    VARCHAR(255)",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS extra_data          JSONB        DEFAULT '{}'",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS started_at          TIMESTAMPTZ  DEFAULT NOW()",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at     TIMESTAMPTZ",
    "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resolved_at         TIMESTAMPTZ",
]

INDEXES_SQL = [
    "CREATE INDEX IF NOT EXISTS ix_conversations_channel_contact_id ON conversations (channel_contact_id)",
    "CREATE INDEX IF NOT EXISTS ix_conversations_business_id         ON conversations (business_id)",
]

BACKFILL_SQL = [
    "UPDATE conversations SET message_count      = 0     WHERE message_count      IS NULL",
    "UPDATE conversations SET is_human_takeover  = false WHERE is_human_takeover  IS NULL",
    "UPDATE conversations SET extra_data         = '{}'  WHERE extra_data         IS NULL",
    "UPDATE conversations SET current_agent      = 'qualifier' WHERE current_agent IS NULL",
    "UPDATE conversations SET started_at         = created_at  WHERE started_at    IS NULL",
]


def upgrade() -> None:
    conn = op.get_bind()
    for sql in COLUMNS_SQL:
        conn.execute(sa.text(sql))
    for sql in BACKFILL_SQL:
        conn.execute(sa.text(sql))
    for sql in INDEXES_SQL:
        conn.execute(sa.text(sql))


def downgrade() -> None:
    pass  # no se eliminan columnas en downgrade para no perder datos
