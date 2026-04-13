"""
Panel Super Admin — solo accesible para usuarios con is_superuser=True.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.models.user import User
from app.models.business import Business
from app.models.conversation import Conversation
from app.models.lead import Lead, LeadStage
from app.models.message import Message
from app.models.plan_config import PlanConfig, DEFAULT_PLANS
from app.api.auth import get_current_user
from app.core.security import get_password_hash
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
import os
import re

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Acceso denegado: se requiere Super Admin")
    return current_user


# ── Platform overview ──────────────────────────────────────────────────────
@router.get("/overview")
async def platform_overview(
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    total_businesses     = await db.scalar(select(func.count(Business.id)).where(Business.is_active == True))
    total_users          = await db.scalar(select(func.count(User.id)).where(User.is_active == True))
    total_conversations  = await db.scalar(select(func.count(Conversation.id)))
    total_leads          = await db.scalar(select(func.count(Lead.id)))
    total_messages       = await db.scalar(select(func.count(Message.id)))
    closed_won           = await db.scalar(select(func.count(Lead.id)).where(Lead.stage == LeadStage.CLOSED_WON))

    return {
        "total_businesses":    total_businesses    or 0,
        "total_users":         total_users         or 0,
        "total_conversations": total_conversations or 0,
        "total_leads":         total_leads         or 0,
        "total_messages":      total_messages      or 0,
        "closed_won":          closed_won          or 0,
        "platform_conversion": round((closed_won or 0) / (total_leads or 1) * 100, 2),
    }


# ── Businesses ─────────────────────────────────────────────────────────────
@router.get("/businesses")
async def list_businesses(
    limit: int = 50,
    offset: int = 0,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Business)
        .order_by(desc(Business.created_at))
        .limit(limit).offset(offset)
    )
    businesses = result.scalars().all()

    # Enriquecer con conteos
    enriched = []
    for biz in businesses:
        conv_count = await db.scalar(select(func.count(Conversation.id)).where(Conversation.business_id == biz.id)) or 0
        lead_count = await db.scalar(select(func.count(Lead.id)).where(Lead.business_id == biz.id)) or 0
        user_count = await db.scalar(select(func.count(User.id)).where(User.business_id == biz.id)) or 0
        enriched.append({
            "id": biz.id,
            "name": biz.name,
            "industry": biz.industry,
            "is_active": biz.is_active,
            "whatsapp_enabled": biz.whatsapp_enabled,
            "webchat_enabled": biz.webchat_enabled,
            "instagram_enabled": biz.instagram_enabled,
            "messenger_enabled": biz.messenger_enabled,
            "linkedin_enabled": biz.linkedin_enabled,
            "tiktok_enabled": biz.tiktok_enabled,
            "created_at": str(biz.created_at),
            "conversations": conv_count,
            "leads": lead_count,
            "users": user_count,
        })

    return enriched


@router.patch("/businesses/{business_id}/toggle")
async def toggle_business(
    business_id: str,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == business_id))
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(404, "Negocio no encontrado")
    biz.is_active = not biz.is_active
    await db.commit()
    return {"is_active": biz.is_active}


# ── Users ──────────────────────────────────────────────────────────────────
@router.get("/users")
async def list_users(
    limit: int = 50,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).order_by(desc(User.created_at)).limit(limit)
    )
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "is_superuser": u.is_superuser,
            "business_id": u.business_id,
            "created_at": str(u.created_at),
        }
        for u in users
    ]


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    is_superuser: bool = False


@router.post("/users", status_code=201)
async def create_user(
    data: CreateUserRequest,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Email ya registrado")

    biz = Business(id=str(uuid.uuid4()), name=f"Negocio de {data.full_name}")
    db.add(biz)
    await db.flush()

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        is_superuser=data.is_superuser,
        business_id=biz.id,
    )
    db.add(user)
    await db.commit()
    return {"id": user.id, "email": user.email, "full_name": user.full_name}


@router.patch("/users/{user_id}/toggle")
async def toggle_user(
    user_id: str,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    user.is_active = not user.is_active
    await db.commit()
    return {"is_active": user.is_active}


# ── Platform-wide analytics ────────────────────────────────────────────────
@router.get("/analytics")
async def platform_analytics(
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    # Top negocios por conversaciones
    top_biz = await db.execute(
        select(Business.name, func.count(Conversation.id).label("convs"))
        .join(Conversation, Conversation.business_id == Business.id)
        .group_by(Business.name)
        .order_by(desc("convs"))
        .limit(10)
    )
    return {
        "top_businesses_by_conversations": [
            {"name": row.name, "conversations": row.convs}
            for row in top_biz.all()
        ],
    }

# ── AI / Claude Settings ───────────────────────────────────────────────────

CLAUDE_MODELS = [
    "claude-sonnet-4-6",
    "claude-opus-4-5",
    "claude-haiku-3-5",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
]

def _mask_key(key: str) -> str:
    """Muestra solo los primeros 12 y últimos 4 caracteres."""
    if not key or len(key) < 16:
        return ""
    return key[:12] + "..." + key[-4:]

def _write_env(var: str, value: str) -> None:
    """Actualiza una variable en el archivo .env raíz."""
    env_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")
    )
    if not os.path.exists(env_path):
        return
    with open(env_path, "r") as f:
        content = f.read()
    pattern = rf"^{re.escape(var)}=.*$"
    replacement = f"{var}={value}"
    if re.search(pattern, content, re.MULTILINE):
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
    else:
        content = content.rstrip("\n") + f"\n{replacement}\n"
    with open(env_path, "w") as f:
        f.write(content)


class AISettingsRequest(BaseModel):
    anthropic_api_key: Optional[str] = None
    claude_model: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_whatsapp_from: Optional[str] = None
    # Meta WhatsApp Business Cloud API
    meta_wa_verify_token: Optional[str] = None
    meta_wa_app_secret: Optional[str] = None
    # Meta Instagram DMs + Facebook Messenger (shared App Secret / verify token)
    instagram_verify_token: Optional[str] = None
    instagram_app_secret: Optional[str] = None


@router.get("/settings")
async def get_ai_settings(_: User = Depends(require_superuser)):
    from app.config import settings
    return {
        "anthropic_api_key_masked": _mask_key(settings.anthropic_api_key),
        "anthropic_api_key_set": bool(settings.anthropic_api_key),
        "claude_model": settings.claude_model,
        "available_models": CLAUDE_MODELS,
        # Twilio
        "twilio_account_sid_masked": _mask_key(settings.twilio_account_sid),
        "twilio_account_sid_set": bool(settings.twilio_account_sid),
        "twilio_auth_token_set": bool(settings.twilio_auth_token),
        "twilio_whatsapp_from": settings.twilio_whatsapp_from,
        # Meta WhatsApp Business Cloud API
        "meta_wa_verify_token": settings.meta_wa_verify_token,
        "meta_wa_app_secret_set": bool(settings.meta_wa_app_secret),
        # Meta Instagram DMs + Facebook Messenger
        "instagram_verify_token": settings.instagram_verify_token,
        "instagram_app_secret_set": bool(settings.instagram_app_secret),
    }


@router.patch("/settings")
async def update_ai_settings(
    data: AISettingsRequest,
    _: User = Depends(require_superuser),
):
    from app.config import settings

    if data.anthropic_api_key is not None:
        key = data.anthropic_api_key.strip()
        if key and not key.startswith("sk-ant-"):
            raise HTTPException(400, "La API key de Anthropic debe empezar con 'sk-ant-'")
        settings.anthropic_api_key = key
        _write_env("ANTHROPIC_API_KEY", key)

    if data.claude_model is not None:
        if data.claude_model not in CLAUDE_MODELS:
            raise HTTPException(400, f"Modelo no válido. Opciones: {', '.join(CLAUDE_MODELS)}")
        settings.claude_model = data.claude_model
        _write_env("CLAUDE_MODEL", data.claude_model)

    if data.twilio_account_sid is not None:
        sid = data.twilio_account_sid.strip()
        if sid and not sid.startswith("AC"):
            raise HTTPException(400, "El Account SID debe empezar con 'AC'")
        settings.twilio_account_sid = sid
        _write_env("TWILIO_ACCOUNT_SID", sid)

    if data.twilio_auth_token is not None:
        settings.twilio_auth_token = data.twilio_auth_token.strip()
        _write_env("TWILIO_AUTH_TOKEN", data.twilio_auth_token.strip())

    if data.twilio_whatsapp_from is not None:
        num = data.twilio_whatsapp_from.strip()
        if num and not num.startswith("whatsapp:"):
            num = f"whatsapp:{num}"
        settings.twilio_whatsapp_from = num
        _write_env("TWILIO_WHATSAPP_FROM", num)

    if data.meta_wa_verify_token is not None:
        token = data.meta_wa_verify_token.strip()
        if token:
            settings.meta_wa_verify_token = token
            _write_env("META_WA_VERIFY_TOKEN", token)

    if data.meta_wa_app_secret is not None:
        secret = data.meta_wa_app_secret.strip()
        settings.meta_wa_app_secret = secret
        _write_env("META_WA_APP_SECRET", secret)

    if data.instagram_verify_token is not None:
        token = data.instagram_verify_token.strip()
        if token:
            settings.instagram_verify_token = token
            _write_env("INSTAGRAM_VERIFY_TOKEN", token)

    if data.instagram_app_secret is not None:
        secret = data.instagram_app_secret.strip()
        settings.instagram_app_secret = secret
        _write_env("INSTAGRAM_APP_SECRET", secret)

    return {
        "anthropic_api_key_masked": _mask_key(settings.anthropic_api_key),
        "anthropic_api_key_set": bool(settings.anthropic_api_key),
        "claude_model": settings.claude_model,
        "twilio_account_sid_masked": _mask_key(settings.twilio_account_sid),
        "twilio_account_sid_set": bool(settings.twilio_account_sid),
        "twilio_auth_token_set": bool(settings.twilio_auth_token),
        "twilio_whatsapp_from": settings.twilio_whatsapp_from,
        "meta_wa_verify_token": settings.meta_wa_verify_token,
        "meta_wa_app_secret_set": bool(settings.meta_wa_app_secret),
        "instagram_verify_token": settings.instagram_verify_token,
        "instagram_app_secret_set": bool(settings.instagram_app_secret),
        "message": "Configuración actualizada correctamente",
    }


@router.post("/whatsapp/test")
async def test_twilio_connection(_: User = Depends(require_superuser)):
    """Verifica que las credenciales de Twilio sean válidas."""
    from app.config import settings
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        raise HTTPException(400, "Configura el Account SID y Auth Token primero")
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        account = client.api.accounts(settings.twilio_account_sid).fetch()
        return {
            "ok": True,
            "account_name": account.friendly_name,
            "account_status": account.status,
            "message": f"Conexión exitosa: {account.friendly_name} ({account.status})",
        }
    except Exception as e:
        raise HTTPException(400, f"Error de conexión Twilio: {str(e)}")


@router.post("/whatsapp-meta/test")
async def test_meta_wa_connection(
    phone_number_id: str,
    access_token: str,
    _: User = Depends(require_superuser),
):
    """
    Verifica que un Phone Number ID y Access Token de Meta sean válidos.
    Llama a la Graph API para obtener info del número.
    """
    from app.services.meta_whatsapp import meta_whatsapp_service
    info = await meta_whatsapp_service.get_phone_number_info(phone_number_id, access_token)
    if not info:
        raise HTTPException(400, "No se pudo verificar el Phone Number ID. Verifica el ID y el token.")
    display = info.get("display_phone_number", "")
    name    = info.get("verified_name", "")
    quality = info.get("quality_rating", "")
    return {
        "ok": True,
        "display_phone_number": display,
        "verified_name": name,
        "quality_rating": quality,
        "message": f"Conexión exitosa: {name} ({display}) — calidad: {quality}",
    }


@router.post("/messenger/test")
async def test_messenger_connection(
    page_id: str,
    access_token: str,
    _: User = Depends(require_superuser),
):
    """
    Verifica que un Facebook Page ID y Page Access Token de Meta sean válidos.
    Llama a la Graph API para obtener info de la página.
    """
    from app.services.meta_social import meta_social_service
    info = await meta_social_service.get_page_info(page_id, access_token)
    if not info:
        raise HTTPException(
            400,
            "No se pudo verificar el Page ID. Comprueba el ID y el token.",
        )
    page_name = info.get("name", "")
    ig_id      = info.get("instagram_business_account", {}).get("id", "")
    return {
        "ok": True,
        "page_name": page_name,
        "instagram_account_id": ig_id,
        "message": f"Conexión exitosa: Página '{page_name}'"
                   + (f" — IG Account ID: {ig_id}" if ig_id else ""),
    }


# ── Plans CRUD ─────────────────────────────────────────────────────────────

class PlanUpdateBody(BaseModel):
    name:        Optional[str]       = None
    price_usd:   Optional[int]       = None
    description: Optional[str]       = None
    features:    Optional[List[str]] = None
    limits:      Optional[dict]      = None
    highlight:   Optional[bool]      = None
    cta:         Optional[str]       = None


async def _seed_plans_if_empty(db: AsyncSession) -> None:
    """Insert default plans if the table is empty."""
    count = await db.scalar(select(func.count(PlanConfig.id)))
    if count == 0:
        for p in DEFAULT_PLANS:
            db.add(PlanConfig(**p))
        await db.commit()


@router.get("/plans")
async def list_plans(
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve los 3 planes configurables."""
    await _seed_plans_if_empty(db)
    result = await db.execute(select(PlanConfig).order_by(PlanConfig.price_usd))
    return [p.to_dict() for p in result.scalars().all()]


@router.put("/plans/{plan_id}")
async def update_plan(
    plan_id: str,
    body: PlanUpdateBody,
    _: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Actualiza precio, características y límites de un plan."""
    await _seed_plans_if_empty(db)
    result = await db.execute(select(PlanConfig).where(PlanConfig.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, f"Plan '{plan_id}' no encontrado")

    if body.name        is not None: plan.name        = body.name
    if body.price_usd   is not None: plan.price_usd   = body.price_usd
    if body.description is not None: plan.description = body.description
    if body.features    is not None: plan.features    = body.features
    if body.limits      is not None: plan.limits      = body.limits
    if body.highlight   is not None: plan.highlight   = body.highlight
    if body.cta         is not None: plan.cta         = body.cta
    plan.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(plan)
    return plan.to_dict()