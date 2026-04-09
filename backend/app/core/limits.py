"""
Helpers para verificar límites de plan antes de crear recursos.
Uso: await check_conversation_limit(db, business_id)
"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.subscription import Subscription, SubscriptionStatus


async def _get_subscription(db: AsyncSession, business_id: str) -> Subscription | None:
    result = await db.execute(
        select(Subscription).where(Subscription.business_id == business_id)
    )
    return result.scalar_one_or_none()


async def check_conversation_limit(db: AsyncSession, business_id: str) -> None:
    sub = await _get_subscription(db, business_id)
    if not sub:
        return  # sin suscripción = trial implícito, permitir
    if not sub.is_active:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="subscription_inactive",
        )
    if not sub.can_create_conversation():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="conversation_limit_reached",
        )


async def check_lead_limit(db: AsyncSession, business_id: str) -> None:
    sub = await _get_subscription(db, business_id)
    if not sub:
        return
    if not sub.is_active:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="subscription_inactive",
        )
    if not sub.can_create_lead():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="lead_limit_reached",
        )


async def check_channel_access(db: AsyncSession, business_id: str, channel: str) -> None:
    sub = await _get_subscription(db, business_id)
    if not sub:
        # sin suscripción solo permite webchat
        if channel != "webchat":
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="channel_not_available",
            )
        return
    if not sub.is_active:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="subscription_inactive",
        )
    if not sub.can_use_channel(channel):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="channel_not_available",
        )


async def increment_conversation_usage(db: AsyncSession, business_id: str) -> None:
    sub = await _get_subscription(db, business_id)
    if sub:
        sub.conversations_this_period += 1
        await db.commit()


async def increment_lead_usage(db: AsyncSession, business_id: str) -> None:
    sub = await _get_subscription(db, business_id)
    if sub:
        sub.leads_this_period += 1
        await db.commit()
