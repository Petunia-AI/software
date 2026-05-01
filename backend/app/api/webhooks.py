"""
Webhooks: WhatsApp (Twilio) + Instagram DMs (Meta Graph API).
"""
from fastapi import APIRouter, Request, Depends, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.conversation import Conversation, Channel
from app.models.message import Message, MessageRole
from app.models.lead import Lead
from app.models.business import Business
from app.models.agent_config import AgentConfig
from app.services.whatsapp import whatsapp_service
from app.services.meta_whatsapp import meta_whatsapp_service
from app.services.meta_social import meta_social_service
from app.agents.orchestrator import AgentOrchestrator
from app.core.websocket import ws_manager
from app.config import settings
from datetime import datetime, timezone
from typing import Optional
import uuid
import hmac
import hashlib
import httpx
import structlog

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
orchestrator = AgentOrchestrator()
logger = structlog.get_logger()


def _build_business_dict(business: Business) -> dict:
    return {
        "name": business.name or "",
        "industry": business.industry or "",
        "description": business.description or "",
        "product_description": business.product_description or "",
        "pricing_info": business.pricing_info or "",
        "target_customer": business.target_customer or "",
        "value_proposition": business.value_proposition or "",
        "objection_handling": business.objection_handling or {},
        "faqs": business.faqs or {},
    }


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Endpoint que Twilio llama cuando llega un mensaje de WhatsApp."""
    form_data = await request.form()
    form_dict = dict(form_data)

    parsed = whatsapp_service.parse_incoming_message(form_dict)
    from_number = parsed["from_number"]
    body = parsed["body"]
    profile_name = parsed["profile_name"]

    if not body:
        return Response(content="", media_type="text/xml")

    # Buscar negocio por número de teléfono configurado
    biz_result = await db.execute(
        select(Business).where(Business.whatsapp_phone == parsed["to_number"], Business.is_active == True)
    )
    business = biz_result.scalar_one_or_none()

    if not business:
        # Usar el primer negocio activo como fallback
        biz_result = await db.execute(select(Business).where(Business.is_active == True).limit(1))
        business = biz_result.scalar_one_or_none()

    if not business:
        return Response(content="", media_type="text/xml")

    # Buscar conversación activa del número
    conv_result = await db.execute(
        select(Conversation)
        .where(
            Conversation.business_id == business.id,
            Conversation.channel == Channel.WHATSAPP,
            Conversation.channel_contact_id == from_number,
            Conversation.status == "active",
        )
        .options(selectinload(Conversation.messages), selectinload(Conversation.lead))
        .order_by(Conversation.started_at.desc())
        .limit(1)
    )
    conv = conv_result.scalar_one_or_none()

    # Si no existe, crear lead + conversación nuevos
    if not conv:
        lead = Lead(
            id=str(uuid.uuid4()),
            business_id=business.id,
            name=profile_name or None,
            phone=from_number,
            source="whatsapp",
        )
        db.add(lead)
        await db.flush()

        conv = Conversation(
            id=str(uuid.uuid4()),
            business_id=business.id,
            lead_id=lead.id,
            channel=Channel.WHATSAPP,
            channel_contact_id=from_number,
        )
        db.add(conv)
        await db.flush()
        conv.messages = []
        conv.lead = lead

    # Guardar mensaje entrante
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.USER,
        content=body,
        channel_message_id=parsed.get("message_sid"),
    )
    db.add(user_msg)
    await db.flush()

    # Cargar configs de agentes
    configs_result = await db.execute(
        select(AgentConfig).where(AgentConfig.business_id == business.id, AgentConfig.is_active == True)
    )
    raw_configs = configs_result.scalars().all()
    agent_configs = {c.agent_type: {"persona_name": c.persona_name, "persona_tone": c.persona_tone} for c in raw_configs}

    business_dict = _build_business_dict(business)
    lead_dict = {
        "id": conv.lead.id if conv.lead else "",
        "name": conv.lead.name if conv.lead else profile_name,
        "phone": from_number,
        "stage": conv.lead.stage if conv.lead else "new",
        "qualification_score": conv.lead.qualification_score if conv.lead else 0,
        "assigned_agent_type": conv.lead.assigned_agent_type if conv.lead else "qualifier",
        "budget": conv.lead.budget if conv.lead else None,
        "authority": conv.lead.authority if conv.lead else None,
        "need": conv.lead.need if conv.lead else None,
        "timeline": conv.lead.timeline if conv.lead else None,
    }

    all_messages = list(conv.messages) + [user_msg]

    # Si está en control humano, no responder con IA
    if conv.is_human_takeover:
        await db.commit()
        return Response(content="", media_type="text/xml")

    # Procesar con orquestador
    ai_response, agent_used, qualification = await orchestrator.process_message(
        user_message=body,
        conversation_history=all_messages,
        business=business_dict,
        lead=lead_dict,
        agent_configs=agent_configs,
    )

    # Guardar respuesta
    ai_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.ASSISTANT,
        content=ai_response,
        agent_type=agent_used,
    )
    db.add(ai_msg)

    # Actualizar conversación
    conv.message_count = (conv.message_count or 0) + 2
    conv.last_message_at = datetime.now(timezone.utc)
    conv.current_agent = agent_used

    # Actualizar lead si hay calificación
    if qualification and conv.lead:
        lead = conv.lead
        lead.qualification_score = qualification.score
        lead.budget = qualification.budget
        lead.authority = qualification.authority
        lead.need = qualification.need
        lead.timeline = qualification.timeline
        lead.last_contacted_at = datetime.now(timezone.utc)
        next_agent = orchestrator.determine_next_agent(qualification)
        if next_agent != "disqualified":
            lead.assigned_agent_type = next_agent

    await db.commit()

    # Enviar respuesta por WhatsApp
    await whatsapp_service.send_message(f"+{from_number}", ai_response)

    # Notificar dashboard via WebSocket
    await ws_manager.send_to_conversation(conv.id, {
        "type": "new_message",
        "message": {"role": "assistant", "content": ai_response, "agent_type": agent_used},
    })

    return Response(content="", media_type="text/xml")


@router.get("/whatsapp")
async def whatsapp_verify(request: Request):
    """Verificación del webhook de WhatsApp (Twilio/Sandbox)."""
    params = dict(request.query_params)
    challenge = params.get("hub.challenge", "")
    return Response(content=challenge, media_type="text/plain")


# ── Meta WhatsApp Business Cloud API webhook ───────────────────────────────

@router.get("/whatsapp-meta")
async def meta_wa_verify(request: Request):
    """
    Verificación del webhook de WhatsApp Business Cloud API (Meta).
    Meta envía hub.mode=subscribe, hub.verify_token y hub.challenge.
    Configura esta URL en Meta App Dashboard → WhatsApp → Configuración.
    """
    params = dict(request.query_params)
    mode         = params.get("hub.mode")
    verify_token = params.get("hub.verify_token")
    challenge    = params.get("hub.challenge", "")

    if mode == "subscribe" and verify_token == settings.meta_wa_verify_token:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verify token mismatch")


@router.post("/whatsapp-meta")
async def meta_wa_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Recibe mensajes de WhatsApp Business Cloud API (Meta).
    El routing se hace por phone_number_id → business.
    Cada negocio registra su propio meta_phone_number_id en su configuración.
    """
    payload = await request.body()

    # Verificar firma HMAC si app_secret está configurado
    sig = request.headers.get("X-Hub-Signature-256", "")
    if settings.meta_wa_app_secret and not _verify_meta_signature(
        payload, sig, settings.meta_wa_app_secret
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = await request.json()

    if data.get("object") != "whatsapp_business_account":
        return {"ok": True}

    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            if change.get("field") != "messages":
                continue

            value           = change.get("value", {})
            phone_number_id = value.get("metadata", {}).get("phone_number_id", "")
            contacts        = {
                c["wa_id"]: c.get("profile", {}).get("name", "")
                for c in value.get("contacts", [])
            }

            for msg in value.get("messages", []):
                if msg.get("type") != "text":
                    continue

                from_number  = msg.get("from", "")
                message_text = msg.get("text", {}).get("body", "")
                message_id   = msg.get("id", "")
                profile_name = contacts.get(from_number, "")

                if not message_text or not from_number:
                    continue

                await _process_meta_wa_message(
                    db=db,
                    phone_number_id=phone_number_id,
                    from_number=from_number,
                    text=message_text,
                    message_id=message_id,
                    profile_name=profile_name,
                )

    return {"ok": True}


async def _process_meta_wa_message(
    db: AsyncSession,
    phone_number_id: str,
    from_number: str,
    text: str,
    message_id: Optional[str],
    profile_name: str,
) -> None:
    """Procesa un mensaje entrante de Meta WA y responde con IA."""

    # Buscar negocio por meta_phone_number_id
    biz_result = await db.execute(
        select(Business).where(
            Business.meta_phone_number_id == phone_number_id,
            Business.is_active == True,
        )
    )
    business = biz_result.scalar_one_or_none()

    if not business:
        return

    if not business.meta_wa_token:
        return

    # Respetar el toggle whatsapp_enabled del negocio
    if not getattr(business, "whatsapp_enabled", True):
        return

    # Buscar conversación activa del número
    conv_result = await db.execute(
        select(Conversation)
        .where(
            Conversation.business_id == business.id,
            Conversation.channel == Channel.WHATSAPP,
            Conversation.channel_contact_id == from_number,
            Conversation.status == "active",
        )
        .options(selectinload(Conversation.messages), selectinload(Conversation.lead))
        .order_by(Conversation.started_at.desc())
        .limit(1)
    )
    conv = conv_result.scalar_one_or_none()

    if not conv:
        lead = Lead(
            id=str(uuid.uuid4()),
            business_id=business.id,
            name=profile_name or None,
            phone=from_number,
            source="whatsapp",
        )
        db.add(lead)
        await db.flush()

        conv = Conversation(
            id=str(uuid.uuid4()),
            business_id=business.id,
            lead_id=lead.id,
            channel=Channel.WHATSAPP,
            channel_contact_id=from_number,
        )
        db.add(conv)
        await db.flush()
        conv.messages = []
        conv.lead = lead

    # Guardar mensaje entrante
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.USER,
        content=text,
        channel_message_id=message_id,
    )
    db.add(user_msg)
    await db.flush()

    if conv.is_human_takeover:
        await db.commit()
        return

    # Cargar configs de agentes
    configs_result = await db.execute(
        select(AgentConfig).where(AgentConfig.business_id == business.id, AgentConfig.is_active == True)
    )
    raw_configs = configs_result.scalars().all()
    agent_configs = {c.agent_type: {"persona_name": c.persona_name, "persona_tone": c.persona_tone} for c in raw_configs}

    business_dict = _build_business_dict(business)
    lead_obj = conv.lead
    lead_dict = {
        "id":                   lead_obj.id if lead_obj else "",
        "name":                 lead_obj.name if lead_obj else profile_name,
        "phone":                from_number,
        "stage":                lead_obj.stage if lead_obj else "new",
        "qualification_score":  lead_obj.qualification_score if lead_obj else 0,
        "assigned_agent_type":  lead_obj.assigned_agent_type if lead_obj else "qualifier",
        "budget":               lead_obj.budget if lead_obj else None,
        "authority":            lead_obj.authority if lead_obj else None,
        "need":                 lead_obj.need if lead_obj else None,
        "timeline":             lead_obj.timeline if lead_obj else None,
    }

    all_messages = list(conv.messages) + [user_msg]

    ai_response, agent_used, qualification = await orchestrator.process_message(
        user_message=text,
        conversation_history=all_messages,
        business=business_dict,
        lead=lead_dict,
        agent_configs=agent_configs,
    )

    ai_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.ASSISTANT,
        content=ai_response,
        agent_type=agent_used,
    )
    db.add(ai_msg)

    conv.message_count = (conv.message_count or 0) + 2
    conv.last_message_at = datetime.now(timezone.utc)
    conv.current_agent = agent_used

    if qualification and conv.lead:
        lead_obj = conv.lead
        lead_obj.qualification_score = qualification.score
        lead_obj.budget    = qualification.budget
        lead_obj.authority = qualification.authority
        lead_obj.need      = qualification.need
        lead_obj.timeline  = qualification.timeline
        lead_obj.last_contacted_at = datetime.now(timezone.utc)
        next_agent = orchestrator.determine_next_agent(qualification)
        if next_agent != "disqualified":
            lead_obj.assigned_agent_type = next_agent

    await db.commit()

    # Responder via Meta WhatsApp Business Cloud API
    await meta_whatsapp_service.send_message(
        phone_number_id=phone_number_id,
        to_phone=from_number,
        message=ai_response,
        access_token=business.meta_wa_token,
    )

    # Notificar dashboard via WebSocket
    await ws_manager.send_to_conversation(conv.id, {
        "type": "new_message",
        "message": {"role": "assistant", "content": ai_response, "agent_type": agent_used},
    })


# ── Instagram DMs webhook ──────────────────────────────────────────────────

def _verify_meta_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verifica la firma HMAC-SHA256 de Meta."""
    if not signature.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


async def _send_instagram_reply(ig_user_id: str, recipient_id: str, message: str, access_token: str) -> None:
    """Envía un mensaje de respuesta via Instagram Graph API."""
    url = f"https://graph.facebook.com/v18.0/{ig_user_id}/messages"
    async with httpx.AsyncClient() as client:
        await client.post(url, json={
            "recipient": {"id": recipient_id},
            "message": {"text": message},
            "messaging_type": "RESPONSE",
        }, params={"access_token": access_token})


@router.get("/instagram")
async def instagram_verify(request: Request):
    """
    Verificación inicial del webhook de Instagram/Meta.
    Meta envía hub.mode=subscribe, hub.verify_token y hub.challenge.
    """
    params = dict(request.query_params)
    mode         = params.get("hub.mode")
    verify_token = params.get("hub.verify_token")
    challenge    = params.get("hub.challenge", "")

    if mode == "subscribe" and verify_token == settings.instagram_verify_token:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verify token mismatch")


@router.post("/instagram")
async def instagram_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Recibe mensajes de Instagram DMs vía Meta Graph API webhook.
    Cada entrada puede tener múltiples cambios; procesamos messaging events.
    """
    payload = await request.body()

    # Verificar firma si está configurada
    sig = request.headers.get("X-Hub-Signature-256", "")
    if settings.instagram_app_secret and not _verify_meta_signature(
        payload, sig, settings.instagram_app_secret
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = await request.json()

    for entry in data.get("entry", []):
        ig_account_id = entry.get("id")  # Instagram Business Account ID
        for messaging in entry.get("messaging", []):
            sender_id  = messaging.get("sender", {}).get("id")
            message    = messaging.get("message", {})
            text       = message.get("text", "")

            # Ignorar mensajes propios (echo)
            if messaging.get("message", {}).get("is_echo"):
                continue

            if not text or not sender_id:
                continue

            await _process_instagram_message(
                db=db,
                ig_account_id=ig_account_id,
                sender_id=sender_id,
                text=text,
                message_id=message.get("mid"),
            )

    return {"ok": True}


async def _process_instagram_message(
    db: AsyncSession,
    ig_account_id: str,
    sender_id: str,
    text: str,
    message_id: Optional[str],
) -> None:
    """Procesa un mensaje entrante de Instagram y responde con IA."""

    # Buscar negocio por ig_account_id
    biz_result = await db.execute(
        select(Business).where(
            Business.instagram_account_id == ig_account_id,
            Business.is_active == True,
        )
    )
    business = biz_result.scalar_one_or_none()

    if not business:
        # Fallback: primer negocio con Instagram habilitado
        biz_result = await db.execute(
            select(Business).where(
                Business.instagram_enabled == True,
                Business.is_active == True,
            ).limit(1)
        )
        business = biz_result.scalar_one_or_none()

    if not business:
        return

    # Buscar conversación activa
    conv_result = await db.execute(
        select(Conversation)
        .where(
            Conversation.business_id == business.id,
            Conversation.channel == Channel.INSTAGRAM,
            Conversation.channel_contact_id == sender_id,
            Conversation.status == "active",
        )
        .options(selectinload(Conversation.messages), selectinload(Conversation.lead))
        .order_by(Conversation.started_at.desc())
        .limit(1)
    )
    conv = conv_result.scalar_one_or_none()

    if not conv:
        lead = Lead(
            id=str(uuid.uuid4()),
            business_id=business.id,
            source="instagram",
        )
        db.add(lead)
        await db.flush()

        conv = Conversation(
            id=str(uuid.uuid4()),
            business_id=business.id,
            lead_id=lead.id,
            channel=Channel.INSTAGRAM,
            channel_contact_id=sender_id,
        )
        db.add(conv)
        await db.flush()
        conv.messages = []
        conv.lead = lead

    # Guardar mensaje entrante
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.USER,
        content=text,
        channel_message_id=message_id,
    )
    db.add(user_msg)
    await db.flush()

    if conv.is_human_takeover:
        await db.commit()
        return

    # Cargar configs de agentes
    configs_result = await db.execute(
        select(AgentConfig).where(AgentConfig.business_id == business.id, AgentConfig.is_active == True)
    )
    raw_configs = configs_result.scalars().all()
    agent_configs = {c.agent_type: {"persona_name": c.persona_name, "persona_tone": c.persona_tone} for c in raw_configs}

    business_dict = _build_business_dict(business)
    lead_obj = conv.lead
    lead_dict = {
        "id":                   lead_obj.id if lead_obj else "",
        "name":                 lead_obj.name if lead_obj else "",
        "stage":                lead_obj.stage if lead_obj else "new",
        "qualification_score":  lead_obj.qualification_score if lead_obj else 0,
        "assigned_agent_type":  lead_obj.assigned_agent_type if lead_obj else "qualifier",
        "budget":               lead_obj.budget if lead_obj else None,
        "authority":            lead_obj.authority if lead_obj else None,
        "need":                 lead_obj.need if lead_obj else None,
        "timeline":             lead_obj.timeline if lead_obj else None,
    }

    all_messages = list(conv.messages) + [user_msg]

    ai_response, agent_used, qualification = await orchestrator.process_message(
        user_message=text,
        conversation_history=all_messages,
        business=business_dict,
        lead=lead_dict,
        agent_configs=agent_configs,
    )

    ai_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.ASSISTANT,
        content=ai_response,
        agent_type=agent_used,
    )
    db.add(ai_msg)

    conv.message_count = (conv.message_count or 0) + 2
    conv.last_message_at = datetime.now(timezone.utc)
    conv.current_agent = agent_used

    if qualification and conv.lead:
        lead_obj = conv.lead
        lead_obj.qualification_score = qualification.score
        lead_obj.budget    = qualification.budget
        lead_obj.authority = qualification.authority
        lead_obj.need      = qualification.need
        lead_obj.timeline  = qualification.timeline
        lead_obj.last_contacted_at = datetime.now(timezone.utc)
        next_agent = orchestrator.determine_next_agent(qualification)
        if next_agent != "disqualified":
            lead_obj.assigned_agent_type = next_agent

    await db.commit()

    # Responder via Instagram Graph API — usar token por negocio si está disponible
    token = business.meta_page_token or settings.instagram_access_token
    if token:
        await meta_social_service.send_instagram_dm(
            ig_account_id=ig_account_id,
            recipient_id=sender_id,
            message=ai_response,
            access_token=token,
        )

    # WebSocket dashboard
    await ws_manager.send_to_conversation(conv.id, {
        "type": "new_message",
        "message": {"role": "assistant", "content": ai_response, "agent_type": agent_used},
    })


# ── Facebook Messenger webhook ────────────────────────────────────────────

@router.get("/messenger")
async def messenger_verify(request: Request):
    """Verificación del webhook de Facebook Messenger."""
    params = dict(request.query_params)
    mode         = params.get("hub.mode")
    verify_token = params.get("hub.verify_token")
    challenge    = params.get("hub.challenge", "")
    valid_tokens = {settings.instagram_verify_token, settings.meta_wa_verify_token}
    if mode == "subscribe" and verify_token in valid_tokens:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verify token mismatch")


@router.post("/messenger")
async def messenger_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Recibe mensajes de Facebook Messenger.
    El routing se hace por page_id (entry.id) → business.instagram_page_id.
    Cada negocio configura su Facebook Page ID + Page Access Token en el panel.
    """
    payload = await request.body()

    sig = request.headers.get("X-Hub-Signature-256", "")
    if settings.instagram_app_secret and not _verify_meta_signature(
        payload, sig, settings.instagram_app_secret
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = await request.json()

    if data.get("object") != "page":
        return {"ok": True}

    for entry in data.get("entry", []):
        page_id = entry.get("id", "")
        for messaging in entry.get("messaging", []):
            sender_psid = messaging.get("sender", {}).get("id", "")
            message     = messaging.get("message", {})
            text        = message.get("text", "")
            message_id  = message.get("mid", "")

            if messaging.get("message", {}).get("is_echo"):
                continue
            if not text or not sender_psid:
                continue

            await _process_messenger_message(
                db=db,
                page_id=page_id,
                sender_psid=sender_psid,
                text=text,
                message_id=message_id,
            )

    return {"ok": True}


async def _process_messenger_message(
    db: AsyncSession,
    page_id: str,
    sender_psid: str,
    text: str,
    message_id: Optional[str],
) -> None:
    """Procesa un mensaje de Messenger y responde con IA."""

    # Buscar negocio por facebook_page_id (instagram_page_id almacena el Page ID)
    biz_result = await db.execute(
        select(Business).where(
            Business.instagram_page_id == page_id,
            Business.messenger_enabled == True,
            Business.is_active == True,
        )
    )
    business = biz_result.scalar_one_or_none()

    if not business or not business.meta_page_token:
        return

    # Buscar conversación activa
    conv_result = await db.execute(
        select(Conversation)
        .where(
            Conversation.business_id == business.id,
            Conversation.channel == Channel.MESSENGER,
            Conversation.channel_contact_id == sender_psid,
            Conversation.status == "active",
        )
        .options(selectinload(Conversation.messages), selectinload(Conversation.lead))
        .order_by(Conversation.started_at.desc())
        .limit(1)
    )
    conv = conv_result.scalar_one_or_none()

    # Track prior messages before potentially creating a new conv.
    # For existing convs, messages are already loaded via selectinload.
    # For new convs we avoid touching the relationship after flush (MissingGreenlet).
    prior_messages: list = []

    if not conv:
        lead = Lead(
            id=str(uuid.uuid4()),
            business_id=business.id,
            source="messenger",
        )
        db.add(lead)
        await db.flush()

        conv = Conversation(
            id=str(uuid.uuid4()),
            business_id=business.id,
            lead_id=lead.id,
            channel=Channel.MESSENGER,
            channel_contact_id=sender_psid,
        )
        db.add(conv)
        await db.flush()
        _lead_obj = lead  # keep reference to avoid lazy load after flush
        # prior_messages stays [] — new conversation has no history
    else:
        prior_messages = list(conv.messages)
        _lead_obj = conv.lead  # loaded via selectinload

    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.USER,
        content=text,
        channel_message_id=message_id,
    )
    db.add(user_msg)
    await db.flush()

    if conv.is_human_takeover:
        await db.commit()
        return

    configs_result = await db.execute(
        select(AgentConfig).where(AgentConfig.business_id == business.id, AgentConfig.is_active == True)
    )
    raw_configs = configs_result.scalars().all()
    agent_configs = {c.agent_type: {"persona_name": c.persona_name, "persona_tone": c.persona_tone} for c in raw_configs}

    business_dict = _build_business_dict(business)
    lead_obj = _lead_obj  # local ref — avoids lazy load on expired conv
    lead_dict = {
        "id":                   lead_obj.id if lead_obj else "",
        "name":                 lead_obj.name if lead_obj else "",
        "stage":                lead_obj.stage if lead_obj else "new",
        "qualification_score":  lead_obj.qualification_score if lead_obj else 0,
        "assigned_agent_type":  lead_obj.assigned_agent_type if lead_obj else "qualifier",
        "budget":               lead_obj.budget if lead_obj else None,
        "authority":            lead_obj.authority if lead_obj else None,
        "need":                 lead_obj.need if lead_obj else None,
        "timeline":             lead_obj.timeline if lead_obj else None,
    }

    all_messages = prior_messages + [user_msg]

    ai_response, agent_used, qualification = await orchestrator.process_message(
        user_message=text,
        conversation_history=all_messages,
        business=business_dict,
        lead=lead_dict,
        agent_configs=agent_configs,
    )

    ai_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.ASSISTANT,
        content=ai_response,
        agent_type=agent_used,
    )
    db.add(ai_msg)

    conv.message_count = (conv.message_count or 0) + 2
    conv.last_message_at = datetime.now(timezone.utc)
    conv.current_agent = agent_used

    if qualification and _lead_obj:
        lead_obj = _lead_obj
        lead_obj.qualification_score = qualification.score
        lead_obj.budget    = qualification.budget
        lead_obj.authority = qualification.authority
        lead_obj.need      = qualification.need
        lead_obj.timeline  = qualification.timeline
        lead_obj.last_contacted_at = datetime.now(timezone.utc)
        next_agent = orchestrator.determine_next_agent(qualification)
        if next_agent != "disqualified":
            lead_obj.assigned_agent_type = next_agent

    await db.commit()

    # Responder via Messenger
    await meta_social_service.send_messenger(
        page_id=page_id,
        recipient_psid=sender_psid,
        message=ai_response,
        access_token=business.meta_page_token,
    )

    await ws_manager.send_to_conversation(conv.id, {
        "type": "new_message",
        "message": {"role": "assistant", "content": ai_response, "agent_type": agent_used},
    })


# ── Facebook Lead Ads webhook ──────────────────────────────────────────────

@router.get("/facebook-leads")
async def facebook_leads_verify(request: Request):
    """
    Verificación del webhook de Facebook Lead Ads.
    Meta envía hub.mode=subscribe, hub.verify_token y hub.challenge.
    """
    params = dict(request.query_params)
    mode         = params.get("hub.mode")
    verify_token = params.get("hub.verify_token")
    challenge    = params.get("hub.challenge", "")

    if mode == "subscribe" and verify_token == settings.instagram_verify_token:
        return Response(content=challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verify token mismatch")


@router.post("/facebook-leads")
async def facebook_leads_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Recibe leads capturados desde Facebook Lead Ads.
    Cada lead se convierte en un Lead en el funnel con source='facebook_lead_ads'.
    """
    payload = await request.body()

    # Verificar firma HMAC si está configurada
    sig = request.headers.get("X-Hub-Signature-256", "")
    if settings.instagram_app_secret and not _verify_meta_signature(
        payload, sig, settings.instagram_app_secret
    ):
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = await request.json()

    for entry in data.get("entry", []):
        page_id = entry.get("id")
        for change in entry.get("changes", []):
            if change.get("field") != "leadgen":
                continue

            lead_data = change.get("value", {})
            leadgen_id  = lead_data.get("leadgen_id")
            form_id     = lead_data.get("form_id")
            ad_id       = lead_data.get("ad_id")

            # Buscar negocio por facebook_page_id
            biz_result = await db.execute(
                select(Business).where(
                    Business.facebook_page_id == page_id,
                    Business.is_active == True,
                )
            )
            business = biz_result.scalar_one_or_none()

            if not business:
                biz_result = await db.execute(
                    select(Business).where(Business.is_active == True).limit(1)
                )
                business = biz_result.scalar_one_or_none()

            if not business:
                continue

            # Obtener los datos del lead desde Graph API
            field_data = await _fetch_lead_field_data(leadgen_id)

            name  = field_data.get("full_name", "")
            email = field_data.get("email", "")
            phone = field_data.get("phone_number", "")

            lead = Lead(
                id=str(uuid.uuid4()),
                business_id=business.id,
                name=name or None,
                email=email or None,
                phone=phone or None,
                source="facebook_lead_ads",
                notes=f"Lead Ad ID: {ad_id} | Form: {form_id} | LeadGen: {leadgen_id}",
            )
            db.add(lead)

    await db.commit()
    return {"ok": True}


async def _fetch_lead_field_data(leadgen_id: str) -> dict:
    """
    Llama a Graph API para obtener los campos del formulario de un lead.
    Retorna dict con claves normalizadas (full_name, email, phone_number, etc.).
    """
    if not settings.facebook_page_token or not leadgen_id:
        return {}

    url = f"https://graph.facebook.com/v18.0/{leadgen_id}"
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url, params={
            "fields": "field_data",
            "access_token": settings.facebook_page_token,
        })
        if r.status_code != 200:
            return {}

        raw_fields = r.json().get("field_data", [])
        return {item["name"]: item["values"][0] for item in raw_fields if item.get("values")}


# ─────────────────────────────────────────────────────────────────────────────
# LINKEDIN WEBHOOK — comentarios en posts
# LinkedIn envía eventos via webhook cuando alguien comenta en tus posts.
# Se requiere suscribirse desde el portal de LinkedIn Developers.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/linkedin")
async def linkedin_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Recibe notificaciones de LinkedIn (comentarios en posts).
    LinkedIn usa un desafío de verificación en el primer GET, y luego
    envía eventos POST cuando hay nuevos comentarios.
    """
    payload = await request.json()

    # LinkedIn envía un array de eventos
    events = payload if isinstance(payload, list) else [payload]

    for event in events:
        # Solo procesamos comentarios nuevos
        if event.get("eventType") != "COMMENT":
            continue

        await _process_linkedin_comment(event, db)

    return {"ok": True}


@router.get("/linkedin")
async def linkedin_webhook_verify(request: Request):
    """Challenge de suscripción de LinkedIn Webhook."""
    challenge = request.query_params.get("challengeCode", "")
    if challenge:
        return {"challengeCode": challenge}
    return Response(status_code=200)


async def _process_linkedin_comment(event: dict, db: AsyncSession):
    """
    Procesa un comentario de LinkedIn y genera respuesta del agente.
    El channel_contact_id es el URN del autor del comentario.
    """
    try:
        author_urn = event.get("actor", "")
        post_urn   = event.get("object", "")   # URN del post comentado
        comment_urn = event.get("id", "")
        text = event.get("message", {}).get("text", "").strip()

        if not text or not author_urn:
            return

        # Buscar negocio por linkedin_person_urn o linkedin_org_id
        result = await db.execute(
            select(Business).where(
                Business.linkedin_enabled == True,
                Business.is_active == True,
            )
        )
        business = result.scalars().first()
        if not business:
            return

        # No responder a comentarios propios
        if author_urn in (business.linkedin_person_urn, business.linkedin_org_id):
            return

        # Buscar o crear lead
        lead_result = await db.execute(
            select(Lead).where(
                Lead.business_id == business.id,
                Lead.notes.contains(author_urn),
            )
        )
        lead = lead_result.scalar_one_or_none()
        if not lead:
            lead = Lead(
                id=str(uuid.uuid4()),
                business_id=business.id,
                name=author_urn.split(":")[-1],
                source="manual",
                notes=f"LinkedIn URN: {author_urn}",
                tags=[],
                is_active=True,
            )
            db.add(lead)
            await db.flush()

        # Buscar o crear conversación
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.business_id == business.id,
                Conversation.channel == Channel.LINKEDIN,
                Conversation.channel_contact_id == author_urn,
                Conversation.status.in_(["active", "waiting"]),
            )
        )
        conv = conv_result.scalar_one_or_none()
        if not conv:
            conv = Conversation(
                id=str(uuid.uuid4()),
                business_id=business.id,
                lead_id=lead.id,
                channel=Channel.LINKEDIN,
                channel_contact_id=author_urn,
                extra_data={"post_urn": post_urn, "comment_urn": comment_urn},
            )
            db.add(conv)
            await db.flush()

        # Guardar mensaje del usuario
        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role=MessageRole.USER,
            content=text,
        )
        db.add(user_msg)
        await db.flush()

        # No responder si hay takeover humano
        if conv.is_human_takeover:
            await db.commit()
            return

        # Obtener historial
        hist_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at)
        )
        history = hist_result.scalars().all()

        # Obtener config de agente
        config_result = await db.execute(
            select(AgentConfig).where(AgentConfig.business_id == business.id)
        )
        agent_config = config_result.scalar_one_or_none()

        # Generar respuesta del agente
        response_text, new_agent, qualification = await orchestrator.process_message(
            message=text,
            conversation=conv,
            lead=lead,
            business=business,
            message_history=history,
            agent_config=agent_config,
        )

        # Guardar respuesta
        ai_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role=MessageRole.ASSISTANT,
            content=response_text,
        )
        db.add(ai_msg)

        conv.current_agent = new_agent
        conv.message_count = (conv.message_count or 0) + 2
        conv.last_message_at = datetime.now(timezone.utc)

        await db.commit()

        # Enviar respuesta como comentario en LinkedIn
        from app.services.linkedin_service import linkedin_service
        author = business.linkedin_org_id or business.linkedin_person_urn
        if author and business.linkedin_access_token:
            await linkedin_service.reply_to_comment(
                access_token=business.linkedin_access_token,
                post_urn=post_urn,
                parent_comment_urn=comment_urn,
                author_urn=author,
                text=response_text,
            )

    except Exception as e:
        import structlog
        structlog.get_logger().error("linkedin_webhook_error", error=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# TIKTOK WEBHOOK — comentarios en videos
# TikTok puede enviar notificaciones via webhook (requiere aprobación).
# También se puede hacer polling desde el frontend con GET /tiktok/comments.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/tiktok")
async def tiktok_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Recibe notificaciones de TikTok (comentarios en videos).
    """
    try:
        payload = await request.json()
    except Exception:
        return Response(status_code=200)

    event_type = payload.get("event", "")
    if event_type != "comment.new":
        return {"ok": True}

    await _process_tiktok_comment(payload, db)
    return {"ok": True}


@router.get("/tiktok")
async def tiktok_webhook_verify(request: Request):
    """Challenge de suscripción de TikTok Webhook."""
    challenge = request.query_params.get("challenge", "")
    if challenge:
        return Response(content=challenge, media_type="text/plain")
    return Response(status_code=200)


async def _process_tiktok_comment(event: dict, db: AsyncSession):
    """
    Procesa un comentario de TikTok y genera respuesta del agente.
    """
    try:
        data = event.get("data", {})
        video_id   = data.get("video_id", "")
        comment_id = data.get("comment_id", "")
        commenter_id = data.get("commenter_id", data.get("open_id", ""))
        text = data.get("text", "").strip()

        if not text or not commenter_id:
            return

        # Buscar negocio
        result = await db.execute(
            select(Business).where(
                Business.tiktok_enabled == True,
                Business.is_active == True,
            )
        )
        business = result.scalars().first()
        if not business:
            return

        # No responder a comentarios propios
        if commenter_id == business.tiktok_open_id:
            return

        # Buscar o crear lead
        lead_result = await db.execute(
            select(Lead).where(
                Lead.business_id == business.id,
                Lead.notes.contains(f"TikTok:{commenter_id}"),
            )
        )
        lead = lead_result.scalar_one_or_none()
        if not lead:
            lead = Lead(
                id=str(uuid.uuid4()),
                business_id=business.id,
                name=f"TikTok user {commenter_id[:8]}",
                source="manual",
                notes=f"TikTok:{commenter_id}",
                tags=[],
                is_active=True,
            )
            db.add(lead)
            await db.flush()

        # Buscar o crear conversación
        conv_result = await db.execute(
            select(Conversation).where(
                Conversation.business_id == business.id,
                Conversation.channel == Channel.TIKTOK,
                Conversation.channel_contact_id == commenter_id,
                Conversation.status.in_(["active", "waiting"]),
            )
        )
        conv = conv_result.scalar_one_or_none()
        if not conv:
            conv = Conversation(
                id=str(uuid.uuid4()),
                business_id=business.id,
                lead_id=lead.id,
                channel=Channel.TIKTOK,
                channel_contact_id=commenter_id,
                extra_data={"video_id": video_id},
            )
            db.add(conv)
            await db.flush()

        # Guardar mensaje usuario
        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role=MessageRole.USER,
            content=text,
        )
        db.add(user_msg)
        await db.flush()

        if conv.is_human_takeover:
            await db.commit()
            return

        # Historial
        hist_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at)
        )
        history = hist_result.scalars().all()

        config_result = await db.execute(
            select(AgentConfig).where(AgentConfig.business_id == business.id)
        )
        agent_config = config_result.scalar_one_or_none()

        # Respuesta del agente
        response_text, new_agent, qualification = await orchestrator.process_message(
            message=text,
            conversation=conv,
            lead=lead,
            business=business,
            message_history=history,
            agent_config=agent_config,
        )

        ai_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role=MessageRole.ASSISTANT,
            content=response_text,
        )
        db.add(ai_msg)

        conv.current_agent = new_agent
        conv.message_count = (conv.message_count or 0) + 2
        conv.last_message_at = datetime.now(timezone.utc)

        await db.commit()

        # Enviar respuesta como comentario en TikTok (máx 150 chars)
        from app.services.tiktok_service import tiktok_service
        if business.tiktok_access_token:
            await tiktok_service.reply_to_comment(
                access_token=business.tiktok_access_token,
                video_id=video_id,
                comment_id=comment_id,
                text=response_text[:150],
            )

    except Exception as e:
        import structlog
        structlog.get_logger().error("tiktok_webhook_error", error=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# ZERNIO WEBHOOK — comentarios y mensajes unificados de todas las redes
#
# Zernio envía un POST cuando hay un nuevo comentario/mensaje en cualquier
# plataforma vinculada (Instagram, Facebook, Twitter/X, LinkedIn, TikTok,
# YouTube, Telegram, WhatsApp, etc.)
# ─────────────────────────────────────────────────────────────────────────────

_PLATFORM_TO_CHANNEL = {
    "instagram": Channel.INSTAGRAM,
    "facebook":  Channel.FACEBOOK,
    "twitter":   Channel.TWITTER,
    "linkedin":  Channel.LINKEDIN,
    "tiktok":    Channel.TIKTOK,
    "youtube":   Channel.YOUTUBE,
    "x":         Channel.TWITTER,
}


@router.post("/zernio")
async def zernio_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Webhook unificado de Zernio. Recibe comentarios y mensajes de
    cualquier red social vinculada y los procesa con el agente de ventas.
    """
    try:
        payload = await request.json()
    except Exception:
        return Response(status_code=200)

    log = structlog.get_logger()
    # Formato de Zernio: event a nivel raíz, platform/profileId en account
    _acct = payload.get("account", {}) or {}
    _evt_platform  = _acct.get("platform") or payload.get("platform", "")
    _evt_profileId = _acct.get("profileId") or payload.get("profileId", "")

    log.info("zernio_webhook_received",
        event_type=payload.get("event"),
        platform=_evt_platform,
        profileId=_evt_profileId,
        keys=list(payload.keys()),
    )

    event    = payload.get("event", "").lower()
    platform = _evt_platform.lower()

    # ── Mensajes directos ─────────────────────────────────────────────────────
    if event in ("message.received", "dm.received", "message_received"):
        try:
            await _process_zernio_dm(payload, db, log)
        except Exception as e:
            log.error("zernio_webhook_dm_error", error=str(e), exc_info=True)
        return {"ok": True}

    # ── Mensajes ignorados (enviados por nosotros, read receipts, etc.) ───────
    if event in ("message.sent", "message.delivered", "message.read",
                 "message.edited", "message.deleted", "message.failed"):
        log.info("zernio_message_event_ignored", event_type=event)
        return {"ok": True}

    # ── Cuenta conectada/desconectada → actualizar BD del negocio ────────────
    if event in ("account.connected", "account.disconnected",
                 "account.ads.initial_sync_completed"):
        try:
            await _process_zernio_account_event(payload, event, _evt_profileId, db, log)
        except Exception as e:
            log.error("zernio_account_event_error", error=str(e), exc_info=True)
        return {"ok": True}

    # ── Posts publicados / fallidos → notificar al negocio ───────────────────
    if event in ("post.published", "post.failed", "post.partial",
                 "post.scheduled", "post.cancelled", "post.recycled"):
        log.info("zernio_post_event", event_type=event, profileId=_evt_profileId)
        return {"ok": True}

    # ── Reviews ───────────────────────────────────────────────────────────────
    if event in ("review.new", "review.updated"):
        try:
            await _process_zernio_review(payload, db, log)
        except Exception as e:
            log.error("zernio_review_event_error", error=str(e), exc_info=True)
        return {"ok": True}

    # ── Comentarios ───────────────────────────────────────────────────────────
    _comment_obj = payload.get("comment") or payload.get("data") or {}
    _author_obj  = _comment_obj.get("author") or _comment_obj.get("sender") or {}
    text         = (_comment_obj.get("text") or _comment_obj.get("content") or _comment_obj.get("message") or "").strip()
    commenter_id = (
        _author_obj.get("id") or _author_obj.get("_id") or
        _comment_obj.get("authorId") or _comment_obj.get("userId") or
        _comment_obj.get("username") or _comment_obj.get("senderId") or ""
    )
    comment_id = _comment_obj.get("_id") or _comment_obj.get("id", "")
    post_id    = _comment_obj.get("postId") or _comment_obj.get("videoId") or ""

    if not text or not commenter_id:
        return {"ok": True}

    if event not in ("comment.created", "comment.received", "mention.received", "comment"):
        log.info("zernio_unknown_event", event_type=event)
        return {"ok": True}

    # Buscar negocio por profileId de Zernio
    profile_id = _evt_profileId
    biz_result = await db.execute(
        select(Business).where(
            Business.zernio_profile_id == profile_id,
            Business.zernio_autoresponder_enabled == True,
            Business.is_active == True,
        )
    )
    business = biz_result.scalar_one_or_none()
    if not business:
        return {"ok": True}

    enabled_channels: list = business.zernio_autoresponder_channels or []
    if enabled_channels and platform not in [c.lower() for c in enabled_channels]:
        return {"ok": True}

    channel = _PLATFORM_TO_CHANNEL.get(platform, Channel.WEBCHAT)
    await _process_zernio_event(
        db=db,
        business=business,
        channel=channel,
        platform=platform,
        commenter_id=commenter_id,
        text=text,
        comment_id=comment_id,
        post_id=post_id,
    )
    return {"ok": True}


async def _process_zernio_account_event(
    payload: dict, event: str, profile_id: str, db: AsyncSession, log
) -> None:
    """Actualiza zernio_connected_platforms en el negocio cuando se conecta/desconecta una cuenta."""
    acct = payload.get("account", {}) or {}
    acct_id  = acct.get("_id") or acct.get("id", "")
    platform = (acct.get("platform") or "").lower()
    username = acct.get("username") or acct.get("displayName") or acct_id

    if not profile_id or not platform:
        return

    biz_result = await db.execute(
        select(Business).where(Business.zernio_profile_id == profile_id, Business.is_active == True)
    )
    business = biz_result.scalar_one_or_none()
    if not business:
        log.warning("zernio_account_event_no_business", profileId=profile_id, event_type=event)
        return

    connected: list = list(business.zernio_connected_platforms or [])

    if event == "account.connected":
        # Añadir si no existe
        exists = any(
            (a.get("accountId") == acct_id or a.get("platform") == platform)
            for a in connected if isinstance(a, dict)
        )
        if not exists:
            connected.append({"platform": platform, "accountId": acct_id, "username": username})
            business.zernio_connected_platforms = connected
            await db.commit()
            log.info("zernio_account_connected_stored", platform=platform, business_id=business.id)

    elif event == "account.disconnected":
        # Eliminar la cuenta desconectada
        updated = [
            a for a in connected
            if isinstance(a, dict) and a.get("accountId") != acct_id
        ]
        if len(updated) != len(connected):
            business.zernio_connected_platforms = updated
            await db.commit()
            log.info("zernio_account_disconnected_stored", platform=platform, business_id=business.id)


async def _process_zernio_review(payload: dict, db: AsyncSession, log) -> None:
    """Procesa una review nueva/actualizada: crea lead y responde con IA si el autoresponder está activo."""
    acct = payload.get("account", {}) or {}
    review = payload.get("review") or payload.get("data") or {}
    profile_id = acct.get("profileId") or payload.get("profileId", "")
    platform   = (acct.get("platform") or "").lower()

    reviewer_id   = review.get("authorId") or review.get("reviewerId") or review.get("id", "")
    reviewer_name = review.get("authorName") or review.get("reviewerName") or reviewer_id
    review_text   = (review.get("text") or review.get("comment") or review.get("content") or "").strip()
    review_id     = review.get("_id") or review.get("id", "")
    rating        = review.get("rating") or review.get("starRating")

    if not reviewer_id or not profile_id:
        return

    biz_result = await db.execute(
        select(Business).where(
            Business.zernio_profile_id == profile_id,
            Business.zernio_autoresponder_enabled == True,
            Business.is_active == True,
        )
    )
    business = biz_result.scalar_one_or_none()
    if not business:
        return

    # Si no hay texto de review, no hay nada que responder
    if not review_text:
        log.info("zernio_review_no_text", review_id=review_id, rating=rating)
        return

    channel = _PLATFORM_TO_CHANNEL.get(platform, Channel.WEBCHAT)
    await _process_zernio_event(
        db=db,
        business=business,
        channel=channel,
        platform=platform,
        commenter_id=reviewer_id,
        text=review_text,
        comment_id=review_id,
        post_id="",
    )


async def _process_zernio_event(
    db: AsyncSession,
    business: Business,
    channel: Channel,
    platform: str,
    commenter_id: str,
    text: str,
    comment_id: str,
    post_id: str,
) -> None:
    """
    Procesa un comentario/mención de Zernio:
    1. Busca o crea Lead
    2. Busca o crea Conversation
    3. Guarda mensaje entrante
    4. Genera respuesta con el orquestador
    5. Publica respuesta via Zernio
    """
    from app.services.zernio_service import zernio_service
    import structlog as _sl
    log = _sl.get_logger()

    try:
        # Deduplicar: si ya procesamos este comment_id, ignorar
        if comment_id:
            dup = await db.execute(
                select(Message).where(Message.channel_message_id == comment_id).limit(1)
            )
            if dup.scalar_one_or_none():
                return

        # Buscar o crear lead por (business_id, channel, commenter_id)
        lead_result = await db.execute(
            select(Lead).where(
                Lead.business_id == business.id,
                Lead.notes.contains(f"zernio:{platform}:{commenter_id}"),
            ).limit(1)
        )
        lead = lead_result.scalar_one_or_none()
        if not lead:
            lead = Lead(
                id=str(uuid.uuid4()),
                business_id=business.id,
                name=commenter_id.lstrip("@"),
                source=platform,
                notes=f"zernio:{platform}:{commenter_id}",
                tags=[],
                is_active=True,
            )
            db.add(lead)
            await db.flush()

        # Buscar o crear conversación activa
        conv_result = await db.execute(
            select(Conversation)
            .where(
                Conversation.business_id == business.id,
                Conversation.channel == channel,
                Conversation.channel_contact_id == commenter_id,
                Conversation.status.in_(["active", "waiting"]),
            )
            .options(selectinload(Conversation.messages), selectinload(Conversation.lead))
            .order_by(Conversation.started_at.desc())
            .limit(1)
        )
        conv = conv_result.scalar_one_or_none()
        if not conv:
            conv = Conversation(
                id=str(uuid.uuid4()),
                business_id=business.id,
                lead_id=lead.id,
                channel=channel,
                channel_contact_id=commenter_id,
                extra_data={"platform": platform, "post_id": post_id},
            )
            db.add(conv)
            await db.flush()
            conv.lead = lead

        # Guardar mensaje entrante
        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role=MessageRole.USER,
            content=text,
            channel_message_id=comment_id or None,
        )
        db.add(user_msg)
        await db.flush()

        if conv.is_human_takeover:
            await db.commit()
            return

        # Cargar configs de agentes
        configs_result = await db.execute(
            select(AgentConfig).where(
                AgentConfig.business_id == business.id,
                AgentConfig.is_active == True,
            )
        )
        raw_configs = configs_result.scalars().all()
        agent_configs = {
            c.agent_type: {"persona_name": c.persona_name, "persona_tone": c.persona_tone}
            for c in raw_configs
        }

        business_dict = _build_business_dict(business)
        lead_obj = conv.lead or lead
        lead_dict = {
            "id":                   lead_obj.id,
            "name":                 lead_obj.name or commenter_id,
            "stage":                lead_obj.stage if lead_obj else "new",
            "qualification_score":  lead_obj.qualification_score if lead_obj else 0,
            "assigned_agent_type":  lead_obj.assigned_agent_type if lead_obj else "qualifier",
            "budget":               lead_obj.budget if lead_obj else None,
            "authority":            lead_obj.authority if lead_obj else None,
            "need":                 lead_obj.need if lead_obj else None,
            "timeline":             lead_obj.timeline if lead_obj else None,
        }

        all_messages = list(conv.messages) + [user_msg]

        ai_response, agent_used, qualification = await orchestrator.process_message(
            user_message=text,
            conversation_history=all_messages,
            business=business_dict,
            lead=lead_dict,
            agent_configs=agent_configs,
        )

        ai_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conv.id,
            role=MessageRole.ASSISTANT,
            content=ai_response,
            agent_type=agent_used,
        )
        db.add(ai_msg)

        conv.message_count = (conv.message_count or 0) + 2
        conv.last_message_at = datetime.now(timezone.utc)
        conv.current_agent = agent_used

        if qualification and lead_obj:
            lead_obj.qualification_score = qualification.score
            lead_obj.budget    = qualification.budget
            lead_obj.authority = qualification.authority
            lead_obj.need      = qualification.need
            lead_obj.timeline  = qualification.timeline
            lead_obj.last_contacted_at = datetime.now(timezone.utc)
            next_agent = orchestrator.determine_next_agent(qualification)
            if next_agent != "disqualified":
                lead_obj.assigned_agent_type = next_agent

        await db.commit()

        # Publicar respuesta via Zernio
        if comment_id:
            max_len = 280 if platform == "twitter" else 1000
            reply_text = ai_response[:max_len]
            await zernio_service.reply_to_comment(
                comment_id=comment_id,
                platform=platform,
                text=reply_text,
            )

        await ws_manager.send_to_conversation(conv.id, {
            "type": "new_message",
            "message": {
                "role": "assistant",
                "content": ai_response,
                "agent_type": agent_used,
                "platform": platform,
            },
        })

        log.info(
            "zernio_event_processed",
            business_id=business.id,
            platform=platform,
            agent=agent_used,
        )

    except Exception as e:
        import structlog as _sl2
        _sl2.get_logger().error("zernio_webhook_error", error=str(e), platform=platform)


# ── Zernio Direct Messages Webhook ───────────────────────────────────────────

@router.post("/zernio-messages")
async def zernio_messages_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Recibe notificaciones de mensajes directos (DMs) de Zernio.
    Soporta: Facebook Messenger, Instagram DM, Twitter, Telegram, WhatsApp, etc.
    """
    import structlog as _sl3
    log = _sl3.get_logger()

    try:
        payload = await request.json()
    except Exception:
        return {"ok": True}

    try:
        await _process_zernio_dm(payload, db, log)
    except Exception as e:
        log.error("zernio_dm_webhook_unhandled", error=str(e), exc_info=True)

    return {"ok": True}


async def _process_zernio_dm(payload: dict, db: AsyncSession, log) -> None:
    """Procesa un DM entrante de Zernio y genera respuesta con IA."""
    # --- Parsear el formato de webhook de Zernio ---
    # Formato: {event, message:{text, sender:{id,name,...}}, conversation:{_id}, account:{_id, platform, profileId}}
    account_obj     = payload.get("account", {}) or {}
    message_obj     = payload.get("message", {}) or {}
    conversation_obj = payload.get("conversation", {}) or {}

    event           = payload.get("event", "").lower()
    platform        = account_obj.get("platform", "").lower()
    zernio_account_id = account_obj.get("_id") or account_obj.get("id", "")
    profile_id      = account_obj.get("profileId") or account_obj.get("profile_id", "")

    # El texto del mensaje puede estar en message.text o message.content
    message_text    = (message_obj.get("text") or message_obj.get("content") or "").strip()
    # El ID del sender está en message.sender.id o message.sender._id
    sender_obj      = message_obj.get("sender", {}) or {}
    sender_id       = (
        sender_obj.get("id") or sender_obj.get("_id") or
        sender_obj.get("senderId") or sender_obj.get("platformId") or ""
    )
    _raw_name   = sender_obj.get("name") or sender_obj.get("username") or sender_obj.get("displayName") or ""
    sender_name = _raw_name if (_raw_name and not _raw_name.isdigit()) else None

    # conversationId de Zernio (para responder por la API de inbox)
    conversation_id = conversation_obj.get("_id") or conversation_obj.get("id", "")

    # Fallbacks: algunos formatos legacy pueden tener estos a nivel raíz
    if not platform:
        platform = payload.get("platform", "").lower()
    if not profile_id:
        profile_id = payload.get("profileId", "")
    if not message_text:
        message_text = (payload.get("message") or payload.get("text") or "").strip()
    if not sender_id:
        sender_id = payload.get("senderId") or payload.get("authorId") or ""
    if not conversation_id:
        conversation_id = payload.get("conversationId", "")

    if not message_text or not sender_id or not platform:
        log.warning("zernio_dm_missing_fields",
            message_text=bool(message_text), sender_id=bool(sender_id), platform=bool(platform),
            payload_keys=list(payload.keys()))
        return

    # Buscar negocio por profileId de Zernio
    biz_result = await db.execute(
        select(Business).where(
            Business.zernio_profile_id == profile_id,
            Business.is_active == True,
        ).limit(1)
    )
    business = biz_result.scalar_one_or_none()

    if not business:
        log.warning("zernio_dm_business_not_found", profile_id=profile_id, platform=platform)
        return

    if not business.zernio_autoresponder_enabled:
        log.info("zernio_dm_autoresponder_disabled", business_id=business.id)
        return

    enabled_channels: list = business.zernio_autoresponder_channels or []
    if enabled_channels and platform.lower() not in [c.lower() for c in enabled_channels]:
        log.info("zernio_dm_channel_disabled", business_id=business.id, platform=platform)
        return

    if not business.zernio_profile_id:
        log.warning("zernio_dm_no_profile_id", business_id=business.id)
        return

    # Mapear plataforma a Channel enum
    channel_map = {
        "facebook": Channel.MESSENGER,
        "instagram": Channel.INSTAGRAM,
        "twitter": Channel.TWITTER,
        "telegram": Channel.WEBCHAT,
        "whatsapp": Channel.WHATSAPP,
        "tiktok": Channel.TIKTOK,
        "linkedin": Channel.LINKEDIN,
        "youtube": Channel.YOUTUBE,
    }
    channel = channel_map.get(platform)
    if not channel:
        log.warning("zernio_dm_unsupported_platform", platform=platform)
        return

    lead_key = f"zernio_dm:{platform}:{sender_id}"
    lead_result = await db.execute(
        select(Lead).where(
            Lead.business_id == business.id,
            Lead.notes.contains(lead_key),
        ).limit(1)
    )
    lead = lead_result.scalar_one_or_none()
    if not lead:
        lead = Lead(
            id=str(uuid.uuid4()),
            business_id=business.id,
            name=sender_name or None,
            source=platform,
            notes=lead_key,
            tags=[],
            is_active=True,
        )
        db.add(lead)
        await db.flush()
    elif sender_name and (not lead.name or (lead.name and lead.name.isdigit())):
        # Actualizar nombre si antes se guardó el ID numérico
        lead.name = sender_name

    # Buscar o crear conversación activa
    conv_result = await db.execute(
        select(Conversation)
        .where(
            Conversation.business_id == business.id,
            Conversation.channel == channel,
            Conversation.channel_contact_id == sender_id,
            Conversation.status.in_(["active", "waiting"]),
        )
        .options(selectinload(Conversation.messages), selectinload(Conversation.lead))
        .order_by(Conversation.started_at.desc())
        .limit(1)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        conv = Conversation(
            id=str(uuid.uuid4()),
            business_id=business.id,
            lead_id=lead.id,
            channel=channel,
            channel_contact_id=sender_id,
            extra_data={"platform": platform, "zernio_conversation_id": conversation_id},
        )
        db.add(conv)
        await db.flush()
        conv.lead = lead

    # Guardar mensaje entrante
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.USER,
        content=message_text,
        channel_message_id=message_obj.get("id") or message_obj.get("_id") or payload.get("id") or None,
    )
    db.add(user_msg)
    await db.flush()

    # Si está en control humano, no responder con IA
    if conv.is_human_takeover:
        await db.commit()
        return

    # Cargar configs de agentes
    configs_result = await db.execute(
        select(AgentConfig).where(
            AgentConfig.business_id == business.id,
            AgentConfig.is_active == True,
        )
    )
    raw_configs = configs_result.scalars().all()
    agent_configs = {
        c.agent_type: {"persona_name": c.persona_name, "persona_tone": c.persona_tone}
        for c in raw_configs
    }

    business_dict = _build_business_dict(business)
    lead_obj = conv.lead or lead
    lead_dict = {
        "id":                   lead_obj.id,
        "name":                 lead_obj.name or sender_name,
        "stage":                lead_obj.stage if lead_obj else "new",
        "qualification_score":  lead_obj.qualification_score if lead_obj else 0,
        "assigned_agent_type":  lead_obj.assigned_agent_type if lead_obj else "qualifier",
        "budget":               lead_obj.budget if lead_obj else None,
        "authority":            lead_obj.authority if lead_obj else None,
        "need":                 lead_obj.need if lead_obj else None,
        "timeline":             lead_obj.timeline if lead_obj else None,
    }

    all_messages = list(conv.messages) + [user_msg]

    # Generar respuesta con el orquestador
    ai_response, agent_used, qualification = await orchestrator.process_message(
        user_message=message_text,
        conversation_history=all_messages,
        business=business_dict,
        lead=lead_dict,
        agent_configs=agent_configs,
    )

    # Guardar respuesta de IA
    ai_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.ASSISTANT,
        content=ai_response,
        agent_type=agent_used,
    )
    db.add(ai_msg)

    # Actualizar conversación
    conv.message_count = (conv.message_count or 0) + 2
    conv.last_message_at = datetime.now(timezone.utc)
    conv.current_agent = agent_used

    # Actualizar lead si hay calificación
    if qualification and conv.lead:
        lead_obj = conv.lead
        lead_obj.qualification_score = qualification.score
        lead_obj.budget = qualification.budget
        lead_obj.authority = qualification.authority
        lead_obj.need = qualification.need
        lead_obj.timeline = qualification.timeline
        lead_obj.last_contacted_at = datetime.now(timezone.utc)
        next_agent = orchestrator.determine_next_agent(qualification)
        if next_agent != "disqualified":
            lead_obj.assigned_agent_type = next_agent

    await db.commit()

    # Enviar respuesta por DM via Zernio
    from app.services.zernio_service import zernio_service as _zernio
    try:
        if conversation_id and zernio_account_id:
            # Método preferido: responder a la conversación existente de Zernio
            await _zernio.reply_to_conversation(
                conversation_id=conversation_id,
                account_id=zernio_account_id,
                message=ai_response,
            )
        elif zernio_account_id:
            # Fallback: crear nueva conversación/mensaje por recipientId
            await _zernio.send_message(
                account_id=zernio_account_id,
                platform=platform,
                recipient_id=sender_id,
                message=ai_response,
            )
        else:
            # Último fallback: buscar account_id de las cuentas conectadas del negocio
            connected: list[dict] = business.zernio_connected_platforms or []
            acct = next((a for a in connected if a.get("platform") == platform), None)
            if acct:
                acct_id = acct.get("accountId") or acct.get("_id") or acct.get("id")
                if acct_id:
                    await _zernio.send_message(
                        account_id=acct_id,
                        platform=platform,
                        recipient_id=sender_id,
                        message=ai_response,
                    )
            else:
                log.warning("zernio_dm_no_account_found", platform=platform)
    except Exception as send_err:
        log.error("zernio_dm_send_failed", error=str(send_err), platform=platform)

    await ws_manager.send_to_conversation(conv.id, {
        "type": "new_message",
        "message": {
            "role": "assistant",
            "content": ai_response,
            "agent_type": agent_used,
            "platform": platform,
        },
    })

    log.info(
        "zernio_dm_processed",
        business_id=business.id,
        platform=platform,
        sender_id=sender_id,
        agent=agent_used,
    )
