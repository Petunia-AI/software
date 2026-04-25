"""
CRM Email Integration Service
Soporta: IMAP/SMTP genérico, Gmail API (OAuth2), Microsoft Graph/Outlook (OAuth2)

Credenciales cifradas con Fernet (AES-128-CBC), clave derivada del SECRET_KEY.
"""
from __future__ import annotations

import asyncio
import base64
import imaplib
import uuid
import smtplib
import ssl
from datetime import datetime, timezone, timedelta
from email import policy
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.parser import BytesParser
from email.utils import parseaddr, parsedate_to_datetime
from typing import Optional

import httpx
import structlog
from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

logger = structlog.get_logger()

# ── Encryption ────────────────────────────────────────────────────────────────

def _get_fernet() -> Fernet:
    raw = settings.secret_key.encode()
    key = base64.urlsafe_b64encode(raw[:32].ljust(32, b"0"))
    return Fernet(key)

def encrypt_secret(value: str) -> str:
    return _get_fernet().encrypt(value.encode()).decode()

def decrypt_secret(token: str) -> str:
    try:
        return _get_fernet().decrypt(token.encode()).decode()
    except (InvalidToken, Exception) as e:
        raise ValueError(f"No se pudo descifrar el secreto: {e}")

# ── IMAP/SMTP Presets ─────────────────────────────────────────────────────────

IMAP_PRESETS: dict[str, dict] = {
    "gmail.com":       {"imap_host": "imap.gmail.com",           "imap_port": 993, "smtp_host": "smtp.gmail.com",           "smtp_port": 587},
    "googlemail.com":  {"imap_host": "imap.gmail.com",           "imap_port": 993, "smtp_host": "smtp.gmail.com",           "smtp_port": 587},
    "outlook.com":     {"imap_host": "outlook.office365.com",    "imap_port": 993, "smtp_host": "smtp.office365.com",       "smtp_port": 587},
    "hotmail.com":     {"imap_host": "outlook.office365.com",    "imap_port": 993, "smtp_host": "smtp.office365.com",       "smtp_port": 587},
    "live.com":        {"imap_host": "outlook.office365.com",    "imap_port": 993, "smtp_host": "smtp.office365.com",       "smtp_port": 587},
    "yahoo.com":       {"imap_host": "imap.mail.yahoo.com",      "imap_port": 993, "smtp_host": "smtp.mail.yahoo.com",      "smtp_port": 587},
    "icloud.com":      {"imap_host": "imap.mail.me.com",         "imap_port": 993, "smtp_host": "smtp.mail.me.com",         "smtp_port": 587},
    "me.com":          {"imap_host": "imap.mail.me.com",         "imap_port": 993, "smtp_host": "smtp.mail.me.com",         "smtp_port": 587},
    "zoho.com":        {"imap_host": "imap.zoho.com",            "imap_port": 993, "smtp_host": "smtp.zoho.com",            "smtp_port": 587},
}

def get_imap_preset(email_address: str) -> dict:
    domain = email_address.split("@")[-1].lower() if "@" in email_address else ""
    return IMAP_PRESETS.get(domain, {})

# ── MIME helpers ──────────────────────────────────────────────────────────────

def _build_mime(
    from_email: str, from_name: str,
    to_emails: list[str], cc_emails: list[str],
    subject: str, body_html: str, body_text: str,
) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Message-ID"] = f"<{uuid.uuid4().hex}@petunia>"
    msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
    msg["To"] = ", ".join(to_emails)
    if cc_emails:
        msg["Cc"] = ", ".join(cc_emails)
    msg["Subject"] = subject
    if body_text:
        msg.attach(MIMEText(body_text, "plain", "utf-8"))
    if body_html:
        msg.attach(MIMEText(body_html, "html", "utf-8"))
    return msg


def _parse_imap_message(raw: bytes) -> dict:
    msg = BytesParser(policy=policy.default).parsebytes(raw)
    from_name_p, from_email_p = parseaddr(msg.get("From", ""))

    def _addrs(header: str) -> list[str]:
        val = msg.get(header, "")
        if not val:
            return []
        return [addr for _, addr in [parseaddr(a.strip()) for a in val.split(",")] if addr]

    date_header = msg.get("Date")
    try:
        received_at = parsedate_to_datetime(date_header) if date_header else datetime.now(timezone.utc)
    except Exception:
        received_at = datetime.now(timezone.utc)

    body_html, body_text = "", ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct == "text/plain" and not body_text:
                body_text = part.get_content() or ""
            elif ct == "text/html" and not body_html:
                body_html = part.get_content() or ""
    else:
        content = msg.get_content() or ""
        if msg.get_content_type() == "text/html":
            body_html = content
        else:
            body_text = content

    return {
        "external_message_id": msg.get("Message-ID", ""),
        "thread_id": msg.get("References", msg.get("In-Reply-To", msg.get("Message-ID", ""))),
        "from_email": from_email_p,
        "from_name": from_name_p,
        "to_emails": _addrs("To"),
        "cc_emails": _addrs("Cc"),
        "subject": str(msg.get("Subject", "(sin asunto)")),
        "body_html": body_html,
        "body_text": body_text,
        "received_at": received_at,
        "is_read": False,
    }

# ── SMTP send ─────────────────────────────────────────────────────────────────

def _smtp_send_sync(
    smtp_host: str, smtp_port: int, use_tls: bool,
    username: str, password: str, mime: MIMEMultipart,
    all_recipients: list[str], from_email: str,
) -> None:
    context = ssl.create_default_context()
    if smtp_port == 465:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=30) as srv:
            srv.login(username, password)
            srv.sendmail(from_email, all_recipients, mime.as_bytes())
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as srv:
            srv.ehlo()
            if use_tls:
                srv.starttls(context=context)
                srv.ehlo()
            srv.login(username, password)
            srv.sendmail(from_email, all_recipients, mime.as_bytes())


async def smtp_send(
    smtp_host: str, smtp_port: int, use_tls: bool,
    username: str, password: str,
    from_email: str, from_name: str,
    to_emails: list[str], cc_emails: list[str],
    subject: str, body_html: str, body_text: str,
) -> None:
    mime = _build_mime(from_email, from_name, to_emails, cc_emails, subject, body_html, body_text)
    all_r = to_emails + (cc_emails or [])
    await asyncio.to_thread(
        _smtp_send_sync, smtp_host, smtp_port, use_tls, username, password, mime, all_r, from_email
    )

# ── IMAP sync ─────────────────────────────────────────────────────────────────

def _imap_sync_sync(imap_host: str, imap_port: int, username: str, password: str, since_days: int = 30) -> list[dict]:
    messages = []
    since_date = (datetime.now() - timedelta(days=since_days)).strftime("%d-%b-%Y")
    with imaplib.IMAP4_SSL(imap_host, imap_port) as imap:
        imap.login(username, password)
        imap.select("INBOX", readonly=True)
        _, data = imap.search(None, f"SINCE {since_date}")
        ids = data[0].split() if data and data[0] else []
        for msg_id in ids[-100:]:
            try:
                _, msg_data = imap.fetch(msg_id, "(RFC822)")
                if msg_data and isinstance(msg_data[0], tuple):
                    messages.append(_parse_imap_message(msg_data[0][1]))
            except Exception as e:
                logger.warning("imap_parse_error", msg_id=msg_id, error=str(e))
    return messages


async def imap_sync(imap_host: str, imap_port: int, username: str, password: str, since_days: int = 30) -> list[dict]:
    return await asyncio.to_thread(_imap_sync_sync, imap_host, imap_port, username, password, since_days)

# ── Gmail OAuth2 ──────────────────────────────────────────────────────────────

GMAIL_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
GMAIL_TOKEN_URL  = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE   = "https://gmail.googleapis.com/gmail/v1"
GMAIL_SCOPES     = ["https://www.googleapis.com/auth/gmail.readonly",
                    "https://www.googleapis.com/auth/gmail.send",
                    "openid", "email", "profile"]


def build_gmail_auth_url(redirect_uri: str, state: str) -> str:
    import urllib.parse
    return GMAIL_AUTH_URL + "?" + urllib.parse.urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    })


async def exchange_gmail_code(code: str, redirect_uri: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.post(GMAIL_TOKEN_URL, data={
            "code": code, "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": redirect_uri, "grant_type": "authorization_code",
        })
        r.raise_for_status()
        return r.json()


async def refresh_gmail_token(refresh_token_decrypted: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.post(GMAIL_TOKEN_URL, data={
            "refresh_token": refresh_token_decrypted,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "grant_type": "refresh_token",
        })
        r.raise_for_status()
        return r.json()


async def gmail_get_profile(access_token: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{GMAIL_API_BASE}/users/me/profile",
                        headers={"Authorization": f"Bearer {access_token}"})
        r.raise_for_status()
        return r.json()


async def gmail_send(access_token: str, from_email: str, from_name: str,
                     to_emails: list[str], cc_emails: list[str],
                     subject: str, body_html: str, body_text: str) -> None:
    mime = _build_mime(from_email, from_name, to_emails, cc_emails, subject, body_html, body_text)
    encoded = base64.urlsafe_b64encode(mime.as_bytes()).decode()
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{GMAIL_API_BASE}/users/me/messages/send",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"raw": encoded},
        )
        r.raise_for_status()


async def gmail_sync_inbox(access_token: str, max_results: int = 50) -> list[dict]:
    messages = []
    async with httpx.AsyncClient(timeout=30) as c:
        headers = {"Authorization": f"Bearer {access_token}"}
        r = await c.get(f"{GMAIL_API_BASE}/users/me/messages",
                        headers=headers, params={"labelIds": "INBOX", "maxResults": max_results})
        r.raise_for_status()
        for m in r.json().get("messages", []):
            try:
                r2 = await c.get(f"{GMAIL_API_BASE}/users/me/messages/{m['id']}",
                                 headers=headers, params={"format": "raw"})
                r2.raise_for_status()
                raw = base64.urlsafe_b64decode(r2.json()["raw"] + "==")
                parsed = _parse_imap_message(raw)
                parsed["external_message_id"] = m["id"]
                messages.append(parsed)
            except Exception as e:
                logger.warning("gmail_parse_error", msg_id=m.get("id"), error=str(e))
    return messages

# ── Microsoft Graph / Outlook OAuth2 ─────────────────────────────────────────

GRAPH_AUTH_BASE  = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
GRAPH_TOKEN_BASE = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
GRAPH_API_BASE   = "https://graph.microsoft.com/v1.0"
GRAPH_SCOPES     = ["offline_access", "Mail.Read", "Mail.Send", "User.Read"]


def build_outlook_auth_url(redirect_uri: str, state: str) -> str:
    import urllib.parse
    tenant = settings.microsoft_tenant_id or "common"
    return GRAPH_AUTH_BASE.format(tenant=tenant) + "?" + urllib.parse.urlencode({
        "client_id": settings.microsoft_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GRAPH_SCOPES),
        "state": state,
        "response_mode": "query",
    })


async def exchange_outlook_code(code: str, redirect_uri: str) -> dict:
    tenant = settings.microsoft_tenant_id or "common"
    async with httpx.AsyncClient() as c:
        r = await c.post(GRAPH_TOKEN_BASE.format(tenant=tenant), data={
            "code": code, "client_id": settings.microsoft_client_id,
            "client_secret": settings.microsoft_client_secret,
            "redirect_uri": redirect_uri, "grant_type": "authorization_code",
            "scope": " ".join(GRAPH_SCOPES),
        })
        r.raise_for_status()
        return r.json()


async def refresh_outlook_token(refresh_token_decrypted: str) -> dict:
    tenant = settings.microsoft_tenant_id or "common"
    async with httpx.AsyncClient() as c:
        r = await c.post(GRAPH_TOKEN_BASE.format(tenant=tenant), data={
            "refresh_token": refresh_token_decrypted,
            "client_id": settings.microsoft_client_id,
            "client_secret": settings.microsoft_client_secret,
            "grant_type": "refresh_token",
            "scope": " ".join(GRAPH_SCOPES),
        })
        r.raise_for_status()
        return r.json()


async def outlook_get_profile(access_token: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{GRAPH_API_BASE}/me",
                        headers={"Authorization": f"Bearer {access_token}"})
        r.raise_for_status()
        return r.json()


async def outlook_send(access_token: str, to_emails: list[str], cc_emails: list[str],
                       subject: str, body_html: str) -> None:
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{GRAPH_API_BASE}/me/sendMail",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "message": {
                    "subject": subject,
                    "body": {"contentType": "HTML", "content": body_html},
                    "toRecipients": [{"emailAddress": {"address": e}} for e in to_emails],
                    "ccRecipients": [{"emailAddress": {"address": e}} for e in cc_emails],
                },
                "saveToSentItems": "true",
            },
        )
        r.raise_for_status()


async def outlook_sync_inbox(access_token: str, max_results: int = 50) -> list[dict]:
    messages = []
    async with httpx.AsyncClient(timeout=30) as c:
        headers = {"Authorization": f"Bearer {access_token}"}
        r = await c.get(f"{GRAPH_API_BASE}/me/messages", headers=headers, params={
            "$top": max_results,
            "$select": "id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,internetMessageId,conversationId,isRead",
            "$orderby": "receivedDateTime desc",
        })
        r.raise_for_status()
        for m in r.json().get("value", []):
            try:
                fa = m.get("from", {}).get("emailAddress", {})
                messages.append({
                    "external_message_id": m.get("internetMessageId") or m.get("id"),
                    "thread_id": m.get("conversationId"),
                    "from_email": fa.get("address", ""),
                    "from_name": fa.get("name", ""),
                    "to_emails": [r_["emailAddress"]["address"] for r_ in m.get("toRecipients", [])],
                    "cc_emails": [r_["emailAddress"]["address"] for r_ in m.get("ccRecipients", [])],
                    "subject": m.get("subject", "(sin asunto)"),
                    "body_html": m.get("body", {}).get("content", ""),
                    "body_text": "",
                    "received_at": datetime.fromisoformat(m["receivedDateTime"].replace("Z", "+00:00")) if m.get("receivedDateTime") else datetime.now(timezone.utc),
                    "is_read": m.get("isRead", False),
                })
            except Exception as e:
                logger.warning("outlook_parse_error", msg_id=m.get("id"), error=str(e))
    return messages
