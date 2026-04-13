"""add missing columns to conversations

Revision ID: 0014
Revises: 0013
Create Date: 2026-04-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
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

    columns = [
        ("current_agent",       sa.String(50),  "'qualifier'"),
        ("channel_contact_id",  sa.String(255), "NULL"),
        ("summary",             sa.Text(),       "NULL"),
        ("sentiment_score",     sa.Float(),      "NULL"),
        ("message_count",       sa.Integer(),   "0"),
        ("is_human_takeover",   sa.Boolean(),   "false"),
        ("human_agent_name",    sa.String(255), "NULL"),
        ("extra_data",          sa.JSON(),       "'{}'"),
        ("last_message_at",     sa.DateTime(timezone=True), "NULL"),
        ("resolved_at",         sa.DateTime(timezone=True), "NULL"),
    ]

    for col_name, col_type, default in columns:
        if not _column_exists(conn, "conversations", col_name):
            op.add_column("conversations", sa.Column(col_name, col_type, nullable=True))
            if default != "NULL":
                op.execute(f"UPDATE conversations SET {col_name} = {default} WHERE {col_name} IS NULL")

    # Crear índice en channel_contact_id si no existe
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_conversations_channel_contact_id "
        "ON conversations (channel_contact_id)"
    ))


def downgrade() -> None:
    for col in ["current_agent", "channel_contact_id", "summary", "sentiment_score",
                "message_count", "is_human_takeover", "human_agent_name",
                "extra_data", "last_message_at", "resolved_at"]:
        op.drop_column("conversations", col)
