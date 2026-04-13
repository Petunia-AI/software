"""fix missing message columns

Revision ID: 0018
Revises: 0017
Create Date: 2026-04-13
"""
from alembic import op

revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE messages
            ADD COLUMN IF NOT EXISTS sentiment         FLOAT,
            ADD COLUMN IF NOT EXISTS intent            VARCHAR(100),
            ADD COLUMN IF NOT EXISTS tokens_used       VARCHAR(20),
            ADD COLUMN IF NOT EXISTS channel_message_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS media_url         VARCHAR(500),
            ADD COLUMN IF NOT EXISTS extra_data        JSONB DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS is_read           BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT NOW()
    """)


def downgrade():
    pass
