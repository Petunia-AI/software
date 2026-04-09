"""add properties and property_images tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-03

- Crea tabla properties (ficha técnica por negocio)
- Crea tabla property_images (galería de imágenes por propiedad)
- Agrega enums: propertytype, operationtype, propertystatus
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision    = "0007"
down_revision = "0006"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    # ── Enums: crear con DO block (IF NOT EXISTS vía EXCEPTION) ─────────
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE propertytype AS ENUM (
                'casa', 'departamento', 'terreno', 'local', 'oficina', 'bodega'
            );
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE operationtype AS ENUM ('venta', 'renta', 'venta_renta');
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE propertystatus AS ENUM (
                'disponible', 'vendida', 'rentada', 'reservada', 'no_disponible'
            );
        EXCEPTION WHEN duplicate_object THEN null; END $$;
    """)

    # Referencias con create_type=False — SQLAlchemy NO intentará re-crear los tipos
    propertytype_enum   = postgresql.ENUM("casa", "departamento", "terreno", "local", "oficina", "bodega",
                                          name="propertytype",   create_type=False)
    operationtype_enum  = postgresql.ENUM("venta", "renta", "venta_renta",
                                          name="operationtype",  create_type=False)
    propertystatus_enum = postgresql.ENUM("disponible", "vendida", "rentada", "reservada", "no_disponible",
                                          name="propertystatus", create_type=False)

    # ── Table: properties ──────────────────────────────────────────────────
    op.create_table(
        "properties",
        sa.Column("id",              sa.String,           primary_key=True),
        sa.Column("business_id",     sa.String,           sa.ForeignKey("businesses.id"), nullable=False),

        # Información básica
        sa.Column("title",           sa.String(500),      nullable=False),
        sa.Column("property_type",   propertytype_enum,   nullable=False),
        sa.Column("operation_type",  operationtype_enum,  nullable=False, server_default="venta"),
        sa.Column("status",          propertystatus_enum, nullable=False, server_default="disponible"),

        # Descripción
        sa.Column("description",     sa.Text,             nullable=True),

        # Ubicación
        sa.Column("address",         sa.String(500),      nullable=True),
        sa.Column("neighborhood",    sa.String(200),      nullable=True),
        sa.Column("city",            sa.String(100),      nullable=True),
        sa.Column("state",           sa.String(100),      nullable=True),

        # Precio
        sa.Column("price",           sa.Float,            nullable=True),
        sa.Column("currency",        sa.String(10),       server_default="USD", nullable=False),

        # Ficha técnica
        sa.Column("bedrooms",        sa.Integer,          nullable=True),
        sa.Column("bathrooms",       sa.Float,            nullable=True),
        sa.Column("parking_spaces",  sa.Integer,          nullable=True),
        sa.Column("area_m2",         sa.Float,            nullable=True),
        sa.Column("construction_m2", sa.Float,            nullable=True),
        sa.Column("floor",           sa.Integer,          nullable=True),
        sa.Column("total_floors",    sa.Integer,          nullable=True),
        sa.Column("age_years",       sa.Integer,          nullable=True),

        # Extras (JSON)
        sa.Column("amenities",       sa.JSON,             nullable=False, server_default="[]"),
        sa.Column("features",        sa.JSON,             nullable=False, server_default="{}"),

        # Portada
        sa.Column("cover_image_url", sa.String(2000),     nullable=True),

        sa.Column("is_active",       sa.Boolean,          server_default="true", nullable=False),
        sa.Column("created_at",      sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at",      sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_properties_business_id", "properties", ["business_id"])

    # ── Table: property_images ─────────────────────────────────────────────
    op.create_table(
        "property_images",
        sa.Column("id",          sa.String,  primary_key=True),
        sa.Column("property_id", sa.String,  sa.ForeignKey("properties.id"), nullable=False),
        sa.Column("url",         sa.String(2000), nullable=False),
        sa.Column("caption",     sa.String(500),  nullable=True),
        sa.Column("is_cover",    sa.Boolean,      server_default="false", nullable=False),
        sa.Column("order",       sa.Integer,      server_default="0",     nullable=False),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_property_images_property_id", "property_images", ["property_id"])


def downgrade() -> None:
    op.drop_index("ix_property_images_property_id", "property_images")
    op.drop_table("property_images")
    op.drop_index("ix_properties_business_id", "properties")
    op.drop_table("properties")
    op.execute("DROP TYPE IF EXISTS propertystatus")
    op.execute("DROP TYPE IF EXISTS operationtype")
    op.execute("DROP TYPE IF EXISTS propertytype")
