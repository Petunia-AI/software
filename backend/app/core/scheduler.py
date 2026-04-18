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
from app.models.followup import FollowUp
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

            # Buscar el negocio para obtener el profileKey de Ayrshare
            biz_res = await db.execute(
                select(Business).where(Business.id == post.business_id)
            )
            biz = biz_res.scalar_one_or_none()
            ayrshare_key = biz.ayrshare_profile_key if biz and biz.ayrshare_enabled else None

            pub_result = await publish_post(
                channel=post.channel.value,
                caption=caption_with_hashtags,
                image_url=post.image_url,
                ayrshare_profile_key=ayrshare_key,
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


# ── Followup notifications ───────────────────────────────────────────────
async def job_followup_notifications():
    """Cada 5 min: marca vencidos, envía email si notify_email=True."""
    from app.models.user import User as UserModel
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        # 1. Marcar como overdue los pending vencidos
        overdue_res = await db.execute(
            select(FollowUp).where(
                FollowUp.status == "pending",
                FollowUp.scheduled_at < now,
            )
        )
        overdue = overdue_res.scalars().all()
        for fu in overdue:
            fu.status = "overdue"
        if overdue:
            await db.commit()
            logger.info("scheduler.followups.marked_overdue", count=len(overdue))

        # 2. Enviar notificaciones de seguimientos en los próximos 15 min
        window_end = now + timedelta(minutes=15)
        due_res = await db.execute(
            select(FollowUp).where(
                FollowUp.status == "pending",
                FollowUp.scheduled_at >= now,
                FollowUp.scheduled_at <= window_end,
                FollowUp.notification_sent_at.is_(None),
                FollowUp.notify_email == True,
            )
        )
        due = due_res.scalars().all()

        for fu in due:
            try:
                # Obtener lead y dueño del business
                lead_res = await db.execute(select(Lead).where(Lead.id == fu.lead_id))
                lead = lead_res.scalar_one_or_none()
                owner_res = await db.execute(
                    select(UserModel).where(UserModel.business_id == fu.business_id)
                    .order_by(UserModel.created_at)
                    .limit(1)
                )
                owner = owner_res.scalar_one_or_none()
                if not owner:
                    continue

                lead_name = lead.name or lead.email or "Lead sin nombre" if lead else "Lead"
                scheduled_str = fu.scheduled_at.strftime("%d/%m/%Y %H:%M UTC")

                await email_service.send_email(
                    to=owner.email,
                    subject=f"⏰ Seguimiento pendiente: {fu.title}",
                    html=f"""
                    <div style='font-family:sans-serif;max-width:500px;margin:auto;padding:24px'>
                      <h2 style='color:#6d28d9'>⏰ Seguimiento programado</h2>
                      <p><strong>{fu.title}</strong></p>
                      <p>Lead: <strong>{lead_name}</strong></p>
                      <p>Tipo: {fu.followup_type.capitalize()}</p>
                      <p>Fecha: {scheduled_str}</p>
                      <p>Prioridad: {fu.priority.capitalize()}</p>
                      {'<p>Descripción: ' + fu.description + '</p>' if fu.description else ''}
                      <a href='http://localhost:3000/seguimiento'
                         style='display:inline-block;background:#6d28d9;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:12px'>
                        Ver seguimientos
                      </a>
                    </div>
                    """,
                )
                fu.notification_sent_at = now
                fu.reminder_count += 1
                logger.info("scheduler.followup.notification_sent", followup_id=fu.id)
            except Exception as exc:
                logger.warning("scheduler.followup.notification_failed", followup_id=fu.id, error=str(exc))

        if due:
            await db.commit()


# ── Ayrshare comment polling (fallback when webhook misses events) ────────
async def job_ayrshare_poll_comments():
    """
    Cada 5 min: por cada negocio con Ayrshare + autoresponder habilitado,
    consulta los comentarios recientes y procesa los que no han sido respondidos.
    Es un fallback para cuando el webhook de Ayrshare no llega.
    """
    from app.api.webhooks import _process_ayrshare_event, _PLATFORM_TO_CHANNEL
    from app.services.ayrshare_service import ayrshare_service
    from app.models.conversation import Channel
    from app.models.message import Message

    async with AsyncSessionLocal() as db:
        biz_result = await db.execute(
            select(Business).where(
                Business.ayrshare_profile_key.isnot(None),
                Business.ayrshare_autoresponder_enabled == True,
                Business.is_active == True,
            )
        )
        businesses = biz_result.scalars().all()

        for business in businesses:
            try:
                platforms = business.ayrshare_connected_platforms or []
                if not platforms:
                    continue

                comments = await ayrshare_service.get_recent_comments(
                    profile_key=business.ayrshare_profile_key,
                    platforms=platforms,
                    last_n=20,
                )

                for comment in comments:
                    comment_id   = comment.get("id", "")
                    platform     = comment.get("platform", "").lower()
                    text         = (comment.get("text") or comment.get("comment") or "").strip()
                    commenter_id = (
                        comment.get("username") or comment.get("userId") or
                        comment.get("senderId") or ""
                    )
                    post_id = comment.get("postId") or comment.get("videoId") or ""

                    if not text or not commenter_id or not comment_id:
                        continue

                    # Deduplicar por channel_message_id
                    dup = await db.execute(
                        select(Message).where(
                            Message.channel_message_id == comment_id
                        ).limit(1)
                    )
                    if dup.scalar_one_or_none():
                        continue  # ya procesado

                    channel = _PLATFORM_TO_CHANNEL.get(platform, Channel.WEBCHAT)

                    await _process_ayrshare_event(
                        db=db,
                        business=business,
                        channel=channel,
                        platform=platform,
                        commenter_id=commenter_id,
                        text=text,
                        comment_id=comment_id,
                        post_id=post_id,
                    )

            except Exception as e:
                logger.warning(
                    "scheduler.ayrshare_poll.failed",
                    business_id=business.id,
                    error=str(e),
                )


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
    scheduler.add_job(
        job_followup_notifications,
        CronTrigger(minute="*/5"),  # every 5 minutes
        id="followup_notifications",
        replace_existing=True,
    )
    scheduler.add_job(
        job_ayrshare_poll_comments,
        CronTrigger(minute="*/5"),  # every 5 minutes
        id="ayrshare_poll_comments",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("scheduler.started", jobs=["trial_reminder", "daily_report", "publish_scheduled_posts", "followup_notifications", "ayrshare_poll_comments"])


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
