"""
Billing API — Stripe subscriptions, portal & webhooks
"""
import stripe
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.config import settings
from app.api.auth import get_current_user
from app.models.user import User
from app.models.subscription import (
    Subscription, SubscriptionStatus, PlanTier,
    PLAN_LIMITS, PLAN_PRICES_USD,
)
from app.services import email_service

router = APIRouter(prefix="/billing", tags=["billing"])

stripe.api_key = settings.stripe_secret_key


async def _get_business_owner(db: AsyncSession, business_id: str) -> User | None:
    result = await db.execute(
        select(User).where(
            User.business_id == business_id,
            User.is_active == True,
        ).limit(1)
    )
    return result.scalar_one_or_none()


# ── Schemas ────────────────────────────────────────────────────────────────
class CheckoutRequest(BaseModel):
    plan: str          # "starter" | "pro" | "enterprise"
    success_url: str
    cancel_url: str


class PortalRequest(BaseModel):
    return_url: str


# ── Helpers ────────────────────────────────────────────────────────────────
async def _get_or_create_subscription(
    db: AsyncSession, business_id: str
) -> Subscription:
    result = await db.execute(
        select(Subscription).where(Subscription.business_id == business_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        sub = Subscription(
            business_id=business_id,
            plan=PlanTier.trial,
            status=SubscriptionStatus.trialing,
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


# ── GET /billing/subscription ──────────────────────────────────────────────
@router.get("/subscription")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await _get_or_create_subscription(db, current_user.business_id)
    limits = PLAN_LIMITS.get(sub.plan.value, PLAN_LIMITS["trial"])
    price  = PLAN_PRICES_USD.get(sub.plan.value, 0)

    return {
        "plan":    sub.plan.value,
        "status":  sub.status.value,
        "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "limits":  limits,
        "price_usd": price,
        "usage": {
            "conversations": sub.conversations_this_period,
            "leads":         sub.leads_this_period,
        },
        "stripe_customer_id": sub.stripe_customer_id,
    }


# ── GET /billing/plans ─────────────────────────────────────────────────────
@router.get("/plans")
async def list_plans():
    plans = []
    for tier in ["starter", "pro", "enterprise"]:
        plans.append({
            "id":    tier,
            "price": PLAN_PRICES_USD[tier],
            "limits": PLAN_LIMITS[tier],
        })
    return plans


# ── POST /billing/checkout ─────────────────────────────────────────────────
@router.post("/checkout")
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    sub = await _get_or_create_subscription(db, current_user.business_id)

    stripe_price_ids = {
        "starter":    settings.stripe_price_starter,
        "pro":        settings.stripe_price_pro,
        "enterprise": settings.stripe_price_enterprise,
    }
    price_id = stripe_price_ids.get(body.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail="invalid_plan")

    # Crear o reutilizar customer de Stripe
    if not sub.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=current_user.full_name,
            metadata={"business_id": current_user.business_id},
        )
        sub.stripe_customer_id = customer.id
        await db.commit()

    session = stripe.checkout.Session.create(
        customer=sub.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=body.success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=body.cancel_url,
        subscription_data={
            "metadata": {"business_id": current_user.business_id},
            "trial_period_days": 0,
        },
        allow_promotion_codes=True,
    )
    return {"url": session.url}


# ── POST /billing/portal ───────────────────────────────────────────────────
@router.post("/portal")
async def create_portal_session(
    body: PortalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    sub = await _get_or_create_subscription(db, current_user.business_id)
    if not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="no_stripe_customer")

    portal = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=body.return_url,
    )
    return {"url": portal.url}


# ── POST /billing/webhook ──────────────────────────────────────────────────
@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = event["data"]["object"]

    if event["type"] == "checkout.session.completed":
        await _handle_checkout_completed(db, data)

    elif event["type"] in ("customer.subscription.updated", "customer.subscription.created"):
        await _handle_subscription_updated(db, data)

    elif event["type"] == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)

    elif event["type"] == "invoice.payment_failed":
        await _handle_payment_failed(db, data)

    return {"received": True}


# ── Webhook handlers ───────────────────────────────────────────────────────
async def _handle_checkout_completed(db: AsyncSession, session):
    business_id = session.get("metadata", {}).get("business_id")
    if not business_id:
        # try via subscription metadata
        stripe_sub = stripe.Subscription.retrieve(session["subscription"])
        business_id = stripe_sub.get("metadata", {}).get("business_id")
    if not business_id:
        return

    await _sync_stripe_subscription(db, business_id, session["subscription"])


async def _handle_subscription_updated(db: AsyncSession, stripe_sub):
    business_id = stripe_sub.get("metadata", {}).get("business_id")
    if not business_id:
        # look up via customer
        result = await db.execute(
            select(Subscription).where(
                Subscription.stripe_subscription_id == stripe_sub["id"]
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            business_id = sub.business_id
    if business_id:
        await _sync_stripe_subscription(db, business_id, stripe_sub["id"], stripe_sub)


async def _handle_subscription_deleted(db: AsyncSession, stripe_sub):
    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == stripe_sub["id"]
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = SubscriptionStatus.canceled
        sub.canceled_at = datetime.now(timezone.utc)
        await db.commit()


async def _handle_payment_failed(db: AsyncSession, invoice):
    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        return
    result = await db.execute(
        select(Subscription).where(
            Subscription.stripe_subscription_id == stripe_sub_id
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = SubscriptionStatus.past_due
        await db.commit()
        # Email
        user = await _get_business_owner(db, sub.business_id)
        if user:
            portal = stripe.billing_portal.Session.create(
                customer=sub.stripe_customer_id,
                return_url=settings.frontend_url + "/billing",
            ) if sub.stripe_customer_id else None
            await email_service.send_payment_failed(
                to_email=user.email,
                name=user.full_name.split()[0],
                portal_url=portal.url if portal else settings.frontend_url + "/billing",
            )


async def _sync_stripe_subscription(
    db: AsyncSession,
    business_id: str,
    stripe_sub_id: str,
    stripe_sub_data=None,
):
    if stripe_sub_data is None:
        stripe_sub_data = stripe.Subscription.retrieve(stripe_sub_id)

    # Map Stripe status → SubscriptionStatus
    status_map = {
        "trialing": SubscriptionStatus.trialing,
        "active":   SubscriptionStatus.active,
        "past_due": SubscriptionStatus.past_due,
        "canceled": SubscriptionStatus.canceled,
        "paused":   SubscriptionStatus.paused,
    }

    # Map Stripe price → PlanTier
    price_id = stripe_sub_data["items"]["data"][0]["price"]["id"]
    stripe_price_ids = {
        "starter":    settings.stripe_price_starter,
        "pro":        settings.stripe_price_pro,
        "enterprise": settings.stripe_price_enterprise,
    }
    plan_map = {v: k for k, v in stripe_price_ids.items()}
    plan_key = plan_map.get(price_id, "starter")
    plan     = PlanTier(plan_key)

    result = await db.execute(
        select(Subscription).where(Subscription.business_id == business_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        sub = Subscription(business_id=business_id)
        db.add(sub)

    sub.stripe_subscription_id = stripe_sub_data["id"]
    sub.stripe_price_id        = price_id
    sub.plan                   = plan
    sub.status = status_map.get(
        stripe_sub_data["status"], SubscriptionStatus.active
    )
    sub.current_period_start = datetime.fromtimestamp(
        stripe_sub_data["current_period_start"], tz=timezone.utc
    )
    sub.current_period_end = datetime.fromtimestamp(
        stripe_sub_data["current_period_end"], tz=timezone.utc
    )
    if stripe_sub_data.get("trial_end"):
        sub.trial_ends_at = datetime.fromtimestamp(
            stripe_sub_data["trial_end"], tz=timezone.utc
        )
    # Reset usage counter on new billing period
    sub.conversations_this_period = 0
    sub.leads_this_period = 0

    await db.commit()

    # Email de activación cuando pasa a active
    if sub.status == SubscriptionStatus.active:
        user = await _get_business_owner(db, business_id)
        if user:
            period_end_str = sub.current_period_end.strftime("%d/%m/%Y") if sub.current_period_end else "—"
            await email_service.send_subscription_activated(
                to_email=user.email,
                name=user.full_name.split()[0],
                plan=sub.plan.value,
                period_end=period_end_str,
            )
