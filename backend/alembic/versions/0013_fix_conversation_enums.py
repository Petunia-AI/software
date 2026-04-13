"""Fix conversation status and channel columns to use proper enum types.

The columns were created as VARCHAR in production but the SQLAlchemy model
expects PostgreSQL enum types (conversationstatus, channel).

Revision ID: 0013
Revises: 0012
Create Date: 2026-04-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # ── conversationstatus enum ──────────────────────────────────────────────
    exists = conn.execute(sa.text(
        "SELECT 1 FROM pg_type WHERE typname = 'conversationstatus'"
    )).fetchone()

    if not exists:
        op.execute("CREATE TYPE conversationstatus AS ENUM ('active','waiting','resolved','escalated')")

    # Check if status column is already the enum type
    col_type = conn.execute(sa.text("""
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'status'
    """)).scalar()

    if col_type and col_type.lower() != 'user-defined':
        op.execute("""
            ALTER TABLE conversations
            ALTER COLUMN status TYPE conversationstatus
            USING status::conversationstatus
        """)

    # ── channel enum ────────────────────────────────────────────────────────
    exists_ch = conn.execute(sa.text(
        "SELECT 1 FROM pg_type WHERE typname = 'channel'"
    )).fetchone()

    if not exists_ch:
        op.execute("CREATE TYPE channel AS ENUM ('whatsapp','instagram','messenger','webchat','email')")

    col_type_ch = conn.execute(sa.text("""
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'channel'
    """)).scalar()

    if col_type_ch and col_type_ch.lower() != 'user-defined':
        op.execute("""
            ALTER TABLE conversations
            ALTER COLUMN channel TYPE channel
            USING channel::channel
        """)


def downgrade():
    op.execute("""
        ALTER TABLE conversations
        ALTER COLUMN status TYPE VARCHAR USING status::VARCHAR
    """)
    op.execute("""
        ALTER TABLE conversations
        ALTER COLUMN channel TYPE VARCHAR USING channel::VARCHAR
    """)
