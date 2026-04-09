"""
APScheduler jobs:
  - trial_reminder   : daily at 09:00 UTC — envía email si faltan 7, 3 o 1 día
  - daily_report     : daily at 08:00 UTC — reporte de ayer a cada business
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.database import AsyncSessionLocal
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User
from app.models.business import Business
from app.models.conversation import Conversation
from app.models.lead import Lead, LeadStage
from app.models.content import SocialPost, ContentStatus
from app.services import email_service
from app.services.social_publisher import publish_post

logger = structlog.get_logger()
scheduler = AsyncIOScheduler(timezone="UTC")


# ── Trial reminder ────────────────────────────────────────────────────────
async def job_trial_reminder():
    logger.info("scheduler.trial_reminder.start")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Subscription).where(
                Subscription.status == SubscriptionStatus.trialing,
                Subscription.trial_ends_at.isnot(None),
            )
        )
        subs = result.scalars().all()

        now = datetime.now(timezone.utc)
        for sub in subs:
            if not sub.trial_ends_at:
                continue
            days_left = (sub.trial_ends_at - now).days

            if days_left not in (7, 3, 1):
                continue

            # Get owner email
            user_result = await db.execute(
                select(User).where(
                    User.business_id == sub.business_id,
                    User.is_active == True,
                ).limit(1)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                continue

            await email_service.send_trial_ending(
                to_email=user.email,
                name=user.full_name.split()[0],
                days_left=days_left,
            )
            logger.info(
                "scheduler.trial_reminder.sent",
                user=user.email,
                days_left=days_left,
            )


# ── Daily report ──────────────────────────────────────────────────────────
async def job_daily_report():
    logger.info("scheduler.daily_report.start")
    async with AsyncSessionLocal() as db:
        yesterday_start = (datetime.now(timezone.utc) - timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        yesterday_end = yesterday_start + timedelta(days=1)

        # Get all active businesses
        biz_result = await db.execute(
            select(Business).where(Business.is_active == True)
        )
        businesses = biz_result.scalars().all()

        for biz in businesses:
            # Get owner
            user_result = await db.execute(
                select(User).where(
                    User.business_id == biz.id,
                    User.is_active == True,
                ).limit(1)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                continue

            # Check subscription allows reports
            sub_result = await db.execute(
                select(Subscription).where(Subscription.business_id == biz.id)
            )
            sub = sub_result.scalar_one_or_none()
            if sub and sub.plan.value not in ("pro", "enterprise"):
                continue  # daily reports only for Pro+

            # Stats
            conv_result = await db.execute(
                select(Conversation).where(
                    Conversation.business_id == biz.id,
                    Conversation.created_at >= yesterday_start,
                    Conversation.created_at < yesterday_end,
                )
            )
            conversations = len(conv_result.scalars().all())

            lead_result = await db.execute(
                select(Lead).where(
                    Lead.business_id == biz.id,
                    Lead.created_at >= yesterday_start,
                    Lead.created_at < yesterday_end,
                )
            )
            leads = lead_result.scalars().all()
            new_leads     = len(leads)
            qualified     = sum(1 for l in leads if (l.qualification_score or 0) >= 7)
            closed_won    = sum(1 for l in leads if l.stage == LeadStage.closed_won)

            if conversations == 0 and new_leads == 0:
                continue  # no activity, skip

            date_str = yesterday_start.strftime("%d/%m/%Y")
            await email_service.send_daily_report(
                to_email=user.email,
                name=user.full_name.split()[0],
                business_name=biz.name,
                stats={
                    "conversations": conversations,
                    "new_leads":     new_leads,
                    "qualified":     qualified,
                    "closed_won":    closed_won,
                },
                date=date_str,
            )
            logger.info("scheduler.daily_report.sent", business=biz.name)


# ── Auto-publish scheduled posts ──────────────────────────────────────────
async def job_publish_scheduled_posts():
    """
    Cada minuto: busca posts con status=scheduled cuyo scheduled_at <= ahora y los publica.
    """
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SocialPost).where(
                SocialPost.status == ContentStatus.scheduled,
                SocialPost.scheduled_at.isnot(None),
                SocialPost.scheduled_at <= now,
            )
        )
        posts = result.scalars().all()

        for post in posts:
            caption_with_hashtags = post.caption
            if post.hashtags:
                tags = " ".join(f"#{h.lstrip('#')}" for h in post.hashtags)
                caption_with_hashtags = f"{post.caption}\n\n{tags}"

            pub_result = await publish_post(
                channel=post.channel.value,
                caption=caption_with_hashtags,
                image_url=post.image_url,
            )

            post.status = ContentStatus.published if pub_result["success"] else ContentStatus.failed
            post.published_at = now if pub_result["success"] else None
            post.platform_post_id = pub_result.get("platform_post_id")
            post.platform_url = pub_result.get("platform_url")
            post.error_message = pub_result.get("error") if not pub_result["success"] else None

            logger.info(
                "scheduler.publish_post",
                post_id=post.id,
                channel=post.channel.value,
                success=pub_result["success"],
            )

        if posts:
            await db.commit()


# ── Setup ─────────────────────────────────────────────────────────────────
def start_scheduler():
    scheduler.add_job(
        job_trial_reminder,
        CronTrigger(hour=9, minute=0),
        id="trial_reminder",
        replace_existing=True,
    )
    scheduler.add_job(
        job_daily_report,
        CronTrigger(hour=8, minute=0),
        id="daily_report",
        replace_existing=True,
    )
    scheduler.add_job(
        job_publish_scheduled_posts,
        CronTrigger(minute="*"),  # every minute
        id="publish_scheduled_posts",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("scheduler.started", jobs=["trial_reminder", "daily_report", "publish_scheduled_posts"])


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
