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

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
orchestrator = AgentOrchestrator()


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
    if mode == "subscribe" and verify_token == settings.instagram_verify_token:
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
        conv.messages = []
        conv.lead = lead

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
