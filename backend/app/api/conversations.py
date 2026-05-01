from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, nullslast
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.conversation import Conversation, ConversationStatus
from app.models.message import Message, MessageRole
from app.models.lead import Lead, LeadStage
from app.models.business import Business
from app.models.agent_config import AgentConfig
from app.api.auth import get_current_user
from app.models.user import User
from app.agents.orchestrator import AgentOrchestrator
from app.core.websocket import ws_manager
from app.schemas.conversation import ConversationOut, SendMessageRequest
from datetime import datetime, timezone
from typing import List, Optional
import uuid

router = APIRouter(prefix="/conversations", tags=["conversations"])
orchestrator = AgentOrchestrator()


def _build_business_dict(business: Business) -> dict:
    return {
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


def _build_lead_dict(lead: Optional[Lead]) -> dict:
    if not lead:
        return {"stage": "new", "qualification_score": 0, "assigned_agent_type": "qualifier"}
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "company": lead.company,
        "stage": lead.stage,
        "budget": lead.budget,
        "authority": lead.authority,
        "need": lead.need,
        "timeline": lead.timeline,
        "qualification_score": lead.qualification_score or 0,
        "assigned_agent_type": lead.assigned_agent_type or "qualifier",
    }


@router.get("", response_model=List[ConversationOut])
async def list_conversations(
    status: Optional[str] = None,
    channel: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Conversation)
        .where(Conversation.business_id == current_user.business_id)
        .options(selectinload(Conversation.messages), selectinload(Conversation.lead))
        .order_by(nullslast(desc(Conversation.last_message_at)))
        .limit(limit)
        .offset(offset)
    )
    if status:
        query = query.where(Conversation.status == status)
    if channel:
        query = query.where(Conversation.channel == channel)
    result = await db.execute(query)
    convs = result.scalars().all()
    # Inyectar lead_name en cada conversación para el listado
    out = []
    for conv in convs:
        d = ConversationOut.model_validate(conv)
        raw_name = conv.lead.name if conv.lead else None
        if raw_name and not raw_name.isdigit():
            d.lead_name = raw_name
        out.append(d)
    return out


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.business_id == current_user.business_id)
        .options(selectinload(Conversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return conv


@router.post("/send")
async def send_message(
    data: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recibe mensaje del usuario → procesa con agente → devuelve respuesta."""
    # Cargar conversación con mensajes
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == data.conversation_id)
        .options(selectinload(Conversation.messages), selectinload(Conversation.lead))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    # Cargar negocio
    biz_result = await db.execute(select(Business).where(Business.id == conv.business_id))
    business = biz_result.scalar_one_or_none()

    # Guardar mensaje del usuario
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role=MessageRole.USER,
        content=data.content,
    )
    db.add(user_msg)
    await db.flush()

    # Cargar configs de agentes
    configs_result = await db.execute(
        select(AgentConfig).where(AgentConfig.business_id == conv.business_id, AgentConfig.is_active == True)
    )
    raw_configs = configs_result.scalars().all()
    agent_configs = {c.agent_type: {"persona_name": c.persona_name, "persona_tone": c.persona_tone} for c in raw_configs}

    # Procesar con orquestador
    business_dict = _build_business_dict(business)
    lead_dict = _build_lead_dict(conv.lead)

    all_messages = list(conv.messages) + [user_msg]

    ai_response, agent_used, qualification = await orchestrator.process_message(
        user_message=data.content,
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

    # Actualizar conversación
    conv.message_count = (conv.message_count or 0) + 2
    conv.last_message_at = datetime.now(timezone.utc)
    conv.current_agent = agent_used

    # Actualizar lead si hay nueva calificación
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
            conv.current_agent = next_agent
        else:
            lead.stage = LeadStage.CLOSED_LOST

    await db.commit()

    # Notificar via WebSocket al dashboard
    await ws_manager.send_to_conversation(conv.id, {
        "type": "new_message",
        "message": {
            "id": ai_msg.id,
            "role": "assistant",
            "content": ai_response,
            "agent_type": agent_used,
            "created_at": str(ai_msg.created_at),
        }
    })

    return {
        "response": ai_response,
        "agent_type": agent_used,
        "qualification": qualification.dict() if qualification else None,
        "message_id": ai_msg.id,
    }


@router.post("/start")
async def start_conversation(
    channel: str = "webchat",
    lead_name: Optional[str] = None,
    lead_phone: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Inicia una nueva conversación y crea el lead asociado."""
    lead = Lead(
        id=str(uuid.uuid4()),
        business_id=current_user.business_id,
        name=lead_name or "Visitante",
        phone=lead_phone,
        source=channel,
    )
    db.add(lead)
    await db.flush()

    conv = Conversation(
        id=str(uuid.uuid4()),
        business_id=current_user.business_id,
        lead_id=lead.id,
        channel=channel,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return {"conversation_id": conv.id, "lead_id": lead.id}


@router.post("/{conversation_id}/takeover")
async def human_takeover(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """El humano toma control de la conversación."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    conv.is_human_takeover = True
    conv.human_agent_name = current_user.full_name
    conv.status = ConversationStatus.ACTIVE
    await db.commit()
    return {"message": "Control tomado por humano"}


@router.post("/{conversation_id}/release")
async def release_human_takeover(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve el control de la conversación a los agentes de IA."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    conv.is_human_takeover = False
    conv.human_agent_name = None
    await db.commit()
    return {"message": "Control devuelto a la IA"}


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket para chat en tiempo real."""
    await ws_manager.connect(websocket, conversation_id)
    try:
        while True:
            await websocket.receive_text()  # keep-alive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, conversation_id)
