"""
Endpoints públicos del widget de chat embeddable.
No requieren autenticación — usan business_id para identificar el negocio.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.models.lead import Lead
from app.models.business import Business
from app.models.agent_config import AgentConfig
from app.agents.orchestrator import AgentOrchestrator
from app.core.websocket import ws_manager
from app.core.rate_limit import limiter
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid

router = APIRouter(prefix="/widget", tags=["widget"])
orchestrator = AgentOrchestrator()


class StartRequest(BaseModel):
    business_id: str
    lead_name: Optional[str] = None
    lead_email: Optional[str] = None


class SendRequest(BaseModel):
    conversation_id: str
    business_id: str
    content: str


@router.post("/start")
@limiter.limit("10/minute")
async def widget_start(
    request: Request,
    body: StartRequest,
    db: AsyncSession = Depends(get_db),
):
    """Crea una conversación de webchat para un visitante (sin auth)."""
    # Validar que el business existe y está activo
    biz_result = await db.execute(select(Business).where(Business.id == body.business_id))
    business = biz_result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    lead = Lead(
        id=str(uuid.uuid4()),
        business_id=body.business_id,
        name=body.lead_name or "Visitante",
        email=body.lead_email,
        source="webchat",
    )
    db.add(lead)
    await db.flush()

    conv = Conversation(
        id=str(uuid.uuid4()),
        business_id=body.business_id,
        lead_id=lead.id,
        channel="webchat",
    )
    db.add(conv)
    await db.commit()

    return {"conversation_id": conv.id, "lead_id": lead.id}


@router.post("/send")
@limiter.limit("30/minute")
async def widget_send(
    request: Request,
    body: SendRequest,
    db: AsyncSession = Depends(get_db),
):
    """Recibe mensaje del visitante y devuelve respuesta del agente (sin auth)."""
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Mensaje vacío")

    # Cargar conversación — validando que pertenece al business_id indicado
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.id == body.conversation_id,
            Conversation.business_id == body.business_id,
        )
        .options(selectinload(Conversation.messages), selectinload(Conversation.lead))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    # Cargar negocio
    biz_result = await db.execute(select(Business).where(Business.id == body.business_id))
    business = biz_result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    # Guardar mensaje del usuario
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.USER,
        content=body.content.strip(),
    )
    db.add(user_msg)
    await db.flush()

    # Cargar configs de agentes
    configs_result = await db.execute(
        select(AgentConfig).where(
            AgentConfig.business_id == body.business_id,
            AgentConfig.is_active == True,
        )
    )
    raw_configs = configs_result.scalars().all()
    agent_configs = {
        c.agent_type: {"persona_name": c.persona_name, "persona_tone": c.persona_tone}
        for c in raw_configs
    }

    # Construir dicts de contexto
    business_dict = {
        "name": business.name,
        "industry": business.industry,
        "description": business.description,
        "product_description": business.product_description,
        "pricing_info": business.pricing_info,
        "target_customer": business.target_customer,
        "value_proposition": business.value_proposition,
        "objection_handling": business.objection_handling or {},
        "faqs": business.faqs or {},
    }

    lead = conv.lead
    lead_dict = {
        "id": lead.id if lead else None,
        "name": lead.name if lead else None,
        "email": lead.email if lead else None,
        "stage": lead.stage if lead else "new",
        "budget": lead.budget if lead else None,
        "authority": lead.authority if lead else None,
        "need": lead.need if lead else None,
        "timeline": lead.timeline if lead else None,
        "qualification_score": (lead.qualification_score or 0) if lead else 0,
        "assigned_agent_type": (lead.assigned_agent_type or "qualifier") if lead else "qualifier",
    }

    all_messages = list(conv.messages) + [user_msg]

    ai_response, agent_used, qualification = await orchestrator.process_message(
        user_message=body.content.strip(),
        conversation_history=all_messages,
        business=business_dict,
        lead=lead_dict,
        agent_configs=agent_configs,
    )

    # Guardar respuesta del agente
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

    if qualification and lead:
        lead.qualification_score = qualification.score
        lead.budget = qualification.budget
        lead.authority = qualification.authority
        lead.need = qualification.need
        lead.timeline = qualification.timeline
        lead.last_contacted_at = datetime.now(timezone.utc)

    await db.commit()

    # Notificar al dashboard en tiempo real
    await ws_manager.send_to_conversation(conv.id, {
        "type": "new_message",
        "message": {
            "id": ai_msg.id,
            "role": "assistant",
            "content": ai_response,
            "agent_type": agent_used,
        },
    })

    return {"response": ai_response, "agent_type": agent_used}
