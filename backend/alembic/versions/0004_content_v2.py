"""content_v2_tiktok_formats_video

Revision ID: 0004
Revises: 0003
Create Date: 2025-01-01 00:00:00.000000

Cambios:
- Agrega 'tiktok' al enum contentchannel
- Agrega columna format_type (post/story/reel)
- Agrega columna video_url
- Agrega columna video_job_id
- Agrega columna animation_style
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Agregar 'tiktok' al enum contentchannel ────────────────────────────
    # PostgreSQL requiere hacerlo con ALTER TYPE ... ADD VALUE
    op.execute("ALTER TYPE contentchannel ADD VALUE IF NOT EXISTS 'tiktok'")

    # ── 2. Agregar nuevas columnas a social_posts ─────────────────────────────
    op.add_column(
        "social_posts",
        sa.Column("format_type", sa.String(20), nullable=False, server_default="post"),
    )
    op.add_column(
        "social_posts",
        sa.Column("video_url", sa.String(2000), nullable=True),
    )
    op.add_column(
        "social_posts",
        sa.Column("video_job_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "social_posts",
        sa.Column("animation_style", sa.String(50), nullable=True),
    )

    # Actualizar image_url para soportar URLs más largas (de 1000 a 2000 chars)
    op.alter_column(
        "social_posts",
        "image_url",
        type_=sa.String(2000),
        existing_nullable=True,
    )


def downgrade() -> None:
    # Eliminar columnas agregadas
    op.drop_column("social_posts", "animation_style")
    op.drop_column("social_posts", "video_job_id")
    op.drop_column("social_posts", "video_url")
    op.drop_column("social_posts", "format_type")

    # Nota: No se puede eliminar un valor de un enum PostgreSQL sin recrear el tipo
    # 'tiktok' se deja en el enum
