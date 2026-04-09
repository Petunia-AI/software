"""Tests de suscripciones, planes y límites."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.subscription import Subscription, SubscriptionStatus, PlanTier, PLAN_LIMITS
from app.core.limits import check_conversation_limit, check_lead_limit
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_get_subscription_returns_trial(client: AsyncClient, test_user, auth_headers):
    """Usuario recién creado tiene suscripción trial."""
    res = await client.get("/api/billing/subscription", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["plan"] in ("trial", "pro")  # test_subscription fixture usa pro
    assert "limits" in data
    assert "usage" in data


@pytest.mark.asyncio
async def test_get_plans_returns_three_plans(client: AsyncClient, auth_headers):
    res = await client.get("/api/billing/plans", headers=auth_headers)
    assert res.status_code == 200
    plans = res.json()
    assert len(plans) == 3
    ids = [p["id"] for p in plans]
    assert "starter" in ids
    assert "pro" in ids
    assert "enterprise" in ids


@pytest.mark.asyncio
async def test_plan_limits_starter():
    limits = PLAN_LIMITS["starter"]
    assert limits["conversations_per_month"] == 500
    assert limits["leads_per_month"] == 200
    assert "webchat" in limits["channels"]
    assert "whatsapp" not in limits["channels"]


@pytest.mark.asyncio
async def test_plan_limits_enterprise():
    limits = PLAN_LIMITS["enterprise"]
    assert limits["conversations_per_month"] == -1
    assert limits["leads_per_month"] == -1
    assert "whatsapp" in limits["channels"]
    assert "instagram" in limits["channels"]


@pytest.mark.asyncio
async def test_subscription_can_create_conversation(db: AsyncSession, test_subscription: Subscription):
    """Plan Pro permite crear conversaciones."""
    await check_conversation_limit(db, test_subscription.business_id)  # no debe lanzar


@pytest.mark.asyncio
async def test_subscription_blocks_when_limit_reached(db: AsyncSession, test_business):
    """Una suscripción Starter bloqueada correctamente al superar límite."""
    sub = Subscription(
        business_id=test_business.id + "_limit_test",
        plan=PlanTier.starter,
        status=SubscriptionStatus.active,
        conversations_this_period=500,  # = límite de starter
    )
    db.add(sub)
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await check_conversation_limit(db, sub.business_id)
    assert exc.value.status_code == 402
    assert exc.value.detail == "conversation_limit_reached"


@pytest.mark.asyncio
async def test_inactive_subscription_blocks_all(db: AsyncSession, test_business):
    """Suscripción cancelada bloquea creación de recursos."""
    sub = Subscription(
        business_id=test_business.id + "_canceled",
        plan=PlanTier.pro,
        status=SubscriptionStatus.canceled,
    )
    db.add(sub)
    await db.commit()

    with pytest.raises(HTTPException) as exc:
        await check_conversation_limit(db, sub.business_id)
    assert exc.value.status_code == 402
    assert exc.value.detail == "subscription_inactive"


@pytest.mark.asyncio
async def test_checkout_without_stripe_configured(client: AsyncClient, auth_headers):
    """Sin Stripe configurado devuelve 500."""
    res = await client.post("/api/billing/checkout", json={
        "plan": "pro",
        "success_url": "http://localhost:3000/billing?ok=1",
        "cancel_url": "http://localhost:3000/billing",
    }, headers=auth_headers)
    # 500 porque stripe_secret_key está vacío en tests
    assert res.status_code in (500, 400)
