import enum
import uuid
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class PlanTier(str, enum.Enum):
    trial       = "trial"
    starter     = "starter"
    pro         = "pro"          # "Profesional" — nombre de display
    enterprise  = "enterprise"   # "Premium"     — nombre de display


class SubscriptionStatus(str, enum.Enum):
    trialing  = "trialing"
    active    = "active"
    past_due  = "past_due"
    canceled  = "canceled"
    paused    = "paused"


# ── Nombres para mostrar en la UI ───────────────────────────────────────────
PLAN_DISPLAY_NAMES: dict[str, str] = {
    "trial":      "Trial",
    "starter":    "Starter",
    "pro":        "Profesional",
    "enterprise": "Premium",
}

# ── Límites por plan ────────────────────────────────────────────────────────
PLAN_LIMITS: dict[str, dict] = {
    "trial": {
        "conversations_per_month": 100,
        "leads_per_month":         50,
        "channels":                ["webchat"],
        "agents":                  3,
        "team_members":            1,
        "trial_days":              14,
        # Contenido
        "content_channels":        ["facebook", "instagram"],
        "content_formats":         ["post", "story"],
        "image_generation":        True,
        "video_generation":        False,
        "heygen":                  False,
        "content_posts_per_month": 10,
        # Almacenamiento de media
        "media_storage_bytes":     500 * 1024 * 1024,          # 500 MB
    },
    "starter": {
        "conversations_per_month": 500,
        "leads_per_month":         200,
        "channels":                ["webchat"],
        "agents":                  3,
        "team_members":            2,
        "trial_days":              0,
        # Contenido
        "content_channels":        ["facebook", "instagram"],
        "content_formats":         ["post", "story"],
        "image_generation":        True,
        "video_generation":        False,
        "heygen":                  False,
        "content_posts_per_month": 30,
        # Almacenamiento de media
        "media_storage_bytes":     500 * 1024 * 1024,          # 500 MB
    },
    "pro": {
        "conversations_per_month": 2000,
        "leads_per_month":         1000,
        "channels":                ["webchat", "whatsapp", "instagram"],
        "agents":                  5,
        "team_members":            10,
        "trial_days":              0,
        # Contenido — plan Profesional
        "content_channels":        ["facebook", "instagram"],
        "content_formats":         ["post", "story"],
        "image_generation":        True,
        "video_generation":        False,
        "heygen":                  False,
        "content_posts_per_month": 100,
        # Almacenamiento de media
        "media_storage_bytes":     2 * 1024 * 1024 * 1024,    # 2 GB
    },
    "enterprise": {
        "conversations_per_month": -1,   # ilimitado
        "leads_per_month":         -1,
        "channels":                ["webchat", "whatsapp", "instagram"],
        "agents":                  -1,
        "team_members":            -1,
        "trial_days":              0,
        # Contenido — plan Premium
        "content_channels":        ["facebook", "instagram", "tiktok", "linkedin"],
        "content_formats":         ["post", "story", "reel"],
        "image_generation":        True,
        "video_generation":        True,
        "heygen":                  True,
        "content_posts_per_month": -1,   # ilimitado
        # Almacenamiento de media
        "media_storage_bytes":     10 * 1024 * 1024 * 1024,   # 10 GB
    },
}

PLAN_PRICES_USD: dict[str, int] = {
    "trial":      0,
    "starter":    49,
    "pro":        149,
    "enterprise": 399,
}

# Stripe price IDs (se sobreescriben con los reales en .env o aquí)
STRIPE_PRICE_IDS: dict[str, str] = {
    "starter":    "price_starter_monthly",
    "pro":        "price_pro_monthly",
    "enterprise": "price_enterprise_monthly",
}


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    business_id: Mapped[str] = mapped_column(
        String, ForeignKey("businesses.id"), unique=True, nullable=False
    )

    plan: Mapped[PlanTier] = mapped_column(
        SAEnum(PlanTier), default=PlanTier.trial, nullable=False
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        SAEnum(SubscriptionStatus), default=SubscriptionStatus.trialing, nullable=False
    )

    # Stripe IDs
    stripe_customer_id:     Mapped[str] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str] = mapped_column(String(255), nullable=True)
    stripe_price_id:        Mapped[str] = mapped_column(String(255), nullable=True)

    # Billing cycle
    current_period_start: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end:   Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    trial_ends_at:        Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    canceled_at:          Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Usage counters (reset each billing period)
    conversations_this_period: Mapped[int] = mapped_column(Integer, default=0)
    leads_this_period:         Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    business: Mapped["Business"] = relationship("Business", back_populates="subscription")  # type: ignore

    # ── Helpers ────────────────────────────────────────────────────────────
    @property
    def limits(self) -> dict:
        return PLAN_LIMITS.get(self.plan.value, PLAN_LIMITS["trial"])

    @property
    def is_active(self) -> bool:
        return self.status in (
            SubscriptionStatus.active, SubscriptionStatus.trialing
        )

    def can_create_conversation(self) -> bool:
        limit = self.limits["conversations_per_month"]
        return limit == -1 or self.conversations_this_period < limit

    def can_create_lead(self) -> bool:
        limit = self.limits["leads_per_month"]
        return limit == -1 or self.leads_this_period < limit

    def can_use_channel(self, channel: str) -> bool:
        return channel in self.limits["channels"]
