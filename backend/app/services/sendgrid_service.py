"""
SendGrid service — Email marketing campaigns and sequences.

Handles sending via SendGrid API (no SDK needed, uses httpx).
Tracks opens/clicks via webhook events.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx
import structlog

from app.config import settings

logger = structlog.get_logger()

SENDGRID_API = "https://api.sendgrid.com/v3"


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.sendgrid_api_key}",
        "Content-Type": "application/json",
    }


def _from_email(override: str | None = None) -> str:
    return override or settings.sendgrid_from_email or settings.email_from


def _from_name(override: str | None = None) -> str:
    return override or settings.sendgrid_from_name or "Petunia AI"


async def send_single(
    *,
    to_email: str,
    to_name: str | None = None,
    subject: str,
    html_content: str,
    from_email: str | None = None,
    from_name: str | None = None,
    reply_to: str | None = None,
    custom_args: dict[str, str] | None = None,
) -> str | None:
    """Send a single transactional email via SendGrid. Returns message ID."""
    if not settings.sendgrid_api_key:
        logger.warning("sendgrid_not_configured")
        return None

    payload: dict[str, Any] = {
        "personalizations": [{
            "to": [{"email": to_email, "name": to_name or to_email}],
        }],
        "from": {"email": _from_email(from_email), "name": _from_name(from_name)},
        "subject": subject,
        "content": [{"type": "text/html", "value": html_content}],
        "tracking_settings": {
            "click_tracking": {"enable": True},
            "open_tracking": {"enable": True},
        },
    }

    if reply_to:
        payload["reply_to"] = {"email": reply_to}

    if custom_args:
        payload["personalizations"][0]["custom_args"] = custom_args

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{SENDGRID_API}/mail/send",
                headers=_headers(),
                json=payload,
            )
            if resp.status_code == 202:
                msg_id = resp.headers.get("X-Message-Id") or str(uuid.uuid4())
                logger.info("sendgrid_sent", to=to_email, subject=subject, message_id=msg_id)
                return msg_id
            else:
                logger.error("sendgrid_send_failed", status=resp.status_code, body=resp.text[:300])
                return None
    except Exception as e:
        logger.error("sendgrid_exception", error=str(e))
        return None


async def send_campaign_batch(
    *,
    recipients: list[dict],  # [{"email": ..., "name": ..., "lead_id": ...}]
    subject: str,
    html_content: str,
    campaign_id: str,
    from_email: str | None = None,
    from_name: str | None = None,
    reply_to: str | None = None,
) -> dict[str, str]:
    """
    Send a campaign to multiple recipients.
    Sends individually to track per-lead opens/clicks via custom_args.
    Returns {email: message_id} mapping.
    """
    results: dict[str, str] = {}
    for r in recipients:
        msg_id = await send_single(
            to_email=r["email"],
            to_name=r.get("name"),
            subject=subject,
            html_content=html_content,
            from_email=from_email,
            from_name=from_name,
            reply_to=reply_to,
            custom_args={
                "campaign_id": campaign_id,
                "lead_id": r.get("lead_id", ""),
            },
        )
        if msg_id:
            results[r["email"]] = msg_id
    return results


async def send_sequence_step(
    *,
    to_email: str,
    to_name: str | None,
    subject: str,
    html_content: str,
    sequence_id: str,
    step_id: str,
    enrollment_id: str,
    lead_id: str,
    from_email: str | None = None,
    from_name: str | None = None,
) -> str | None:
    """Send a sequence step email. Returns message ID."""
    return await send_single(
        to_email=to_email,
        to_name=to_name,
        subject=subject,
        html_content=html_content,
        from_email=from_email,
        from_name=from_name,
        custom_args={
            "sequence_id": sequence_id,
            "step_id": step_id,
            "enrollment_id": enrollment_id,
            "lead_id": lead_id,
        },
    )


def parse_webhook_events(events: list[dict]) -> list[dict]:
    """
    Parse SendGrid event webhook payload.
    Returns list of normalized events with: type, message_id, campaign_id, lead_id, timestamp
    """
    parsed = []
    for ev in events:
        event_type = ev.get("event", "")
        message_id = ev.get("sg_message_id", "").split(".")[0]  # strip suffix
        custom_args = ev.get("custom_args", {}) or {}

        # SendGrid also puts custom_args at top-level
        campaign_id = ev.get("campaign_id") or custom_args.get("campaign_id")
        sequence_id = ev.get("sequence_id") or custom_args.get("sequence_id")
        step_id = ev.get("step_id") or custom_args.get("step_id")
        enrollment_id = ev.get("enrollment_id") or custom_args.get("enrollment_id")
        lead_id = ev.get("lead_id") or custom_args.get("lead_id")
        timestamp = datetime.fromtimestamp(ev.get("timestamp", 0), tz=timezone.utc)

        parsed.append({
            "type": event_type,
            "message_id": message_id,
            "campaign_id": campaign_id,
            "sequence_id": sequence_id,
            "step_id": step_id,
            "enrollment_id": enrollment_id,
            "lead_id": lead_id,
            "timestamp": timestamp,
            "email": ev.get("email", ""),
        })
    return parsed
