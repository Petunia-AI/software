"""
PlanConfig model — configurable plan definitions stored in DB.
Allows super admins to update plan prices, features and limits
without code deploys.
"""
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, Text, DateTime
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PlanConfig(Base):
    __tablename__ = "plan_configs"

    id:          Mapped[str]  = mapped_column(String(50),  primary_key=True)   # "starter" | "pro" | "enterprise"
    name:        Mapped[str]  = mapped_column(String(100), nullable=False)
    price_usd:   Mapped[int]  = mapped_column(Integer,     nullable=False, default=0)
    description: Mapped[str]  = mapped_column(Text,        nullable=True)
    features:    Mapped[list] = mapped_column(JSON,        nullable=False, default=list)
    limits:      Mapped[dict] = mapped_column(JSON,        nullable=False, default=dict)
    highlight:   Mapped[bool] = mapped_column(Boolean,     nullable=False, default=False)
    cta:         Mapped[str]  = mapped_column(String(200), nullable=True)
    updated_at:  Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    def to_dict(self) -> dict:
        return {
            "id":          self.id,
            "name":        self.name,
            "price_usd":   self.price_usd,
            "description": self.description,
            "features":    self.features or [],
            "limits":      self.limits or {},
            "highlight":   self.highlight,
            "cta":         self.cta or "",
            "updated_at":  self.updated_at.isoformat() if self.updated_at else None,
        }


# ── Default seed data (used as fallback if DB is empty) ────────────────────
DEFAULT_PLANS: list[dict] = [
    {
        "id": "starter",
        "name": "Starter",
        "price_usd": 49,
        "description": "Para equipos que empiezan a automatizar ventas.",
        "features": [
            "500 conversaciones / mes",
            "200 leads / mes",
            "3 agentes IA activos",
            "Canal Webchat",
            "Dashboard analytics",
            "Soporte por email",
        ],
        "limits": {"conversations_per_month": 500, "leads_per_month": 200, "channels": ["webchat"], "agents": 3, "team_members": 2},
        "highlight": False,
        "cta": "Empieza gratis 14 días",
    },
    {
        "id": "pro",
        "name": "Pro",
        "price_usd": 149,
        "description": "El favorito de equipos de ventas en crecimiento.",
        "features": [
            "2,000 conversaciones / mes",
            "1,000 leads / mes",
            "5 agentes IA (todos)",
            "WhatsApp + Webchat + Instagram",
            "Analytics avanzado",
            "Reportes diarios por email",
            "Soporte prioritario",
            "Hasta 10 usuarios",
        ],
        "limits": {"conversations_per_month": 2000, "leads_per_month": 1000, "channels": ["webchat", "whatsapp", "instagram"], "agents": 5, "team_members": 10},
        "highlight": True,
        "cta": "Empieza gratis 14 días",
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "price_usd": 399,
        "description": "Para empresas con volumen alto y necesidades custom.",
        "features": [
            "Conversaciones ilimitadas",
            "Leads ilimitados",
            "Agentes ilimitados",
            "Todos los canales",
            "API access",
            "SLA 99.9% uptime",
            "Onboarding dedicado",
            "Usuarios ilimitados",
        ],
        "limits": {"conversations_per_month": -1, "leads_per_month": -1, "channels": ["webchat", "whatsapp", "instagram"], "agents": -1, "team_members": -1},
        "highlight": False,
        "cta": "Hablar con ventas",
    },
]
