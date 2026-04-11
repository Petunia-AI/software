"""plan_configs table

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS plan_configs (
            id          VARCHAR(50)  NOT NULL PRIMARY KEY,
            name        VARCHAR(100) NOT NULL,
            price_usd   INTEGER      NOT NULL DEFAULT 0,
            description TEXT,
            features    JSON         NOT NULL DEFAULT '[]',
            limits      JSON         NOT NULL DEFAULT '{}',
            highlight   BOOLEAN      NOT NULL DEFAULT FALSE,
            cta         VARCHAR(200),
            updated_at  TIMESTAMP WITH TIME ZONE
        )
    """))

    op.execute(sa.text(r"""
        INSERT INTO plan_configs (id, name, price_usd, description, features, limits, highlight, cta) VALUES
        ('starter', 'Starter', 49,
         'Para equipos que empiezan a automatizar ventas.',
         '["500 conversaciones / mes","200 leads / mes","3 agentes IA activos","Canal Webchat","Dashboard analytics","Soporte por email"]',
         '{"conversations_per_month": 500, "leads_per_month": 200, "channels": ["webchat"], "agents": 3, "team_members": 2}',
         false, 'Empieza gratis 14 dias'),
        ('pro', 'Pro', 149,
         'El favorito de equipos de ventas en crecimiento.',
         '["2000 conversaciones / mes","1000 leads / mes","5 agentes IA (todos)","WhatsApp + Webchat + Instagram","Analytics avanzado","Soporte prioritario","Hasta 10 usuarios"]',
         '{"conversations_per_month": 2000, "leads_per_month": 1000, "channels": ["webchat","whatsapp","instagram"], "agents": 5, "team_members": 10}',
         true, 'Empieza gratis 14 dias'),
        ('enterprise', 'Enterprise', 399,
         'Para empresas con volumen alto y necesidades custom.',
         '["Conversaciones ilimitadas","Leads ilimitados","Agentes ilimitados","Todos los canales","API access","SLA 99.9% uptime","Onboarding dedicado","Usuarios ilimitados"]',
         '{"conversations_per_month": -1, "leads_per_month": -1, "channels": ["webchat","whatsapp","instagram"], "agents": -1, "team_members": -1}',
         false, 'Hablar con ventas')
        ON CONFLICT (id) DO NOTHING
    """))


def downgrade() -> None:
    op.drop_table("plan_configs")
