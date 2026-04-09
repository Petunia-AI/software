from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.business import Business
from app.models.agent_config import AgentConfig
from app.api.auth import get_current_user
from app.models.user import User
from app.schemas.business import BusinessOut, BusinessCreate, BusinessUpdate
import uuid

router = APIRouter(prefix="/business", tags=["business"])


@router.get("/", response_model=BusinessOut)
async def get_my_business(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return business


@router.patch("/", response_model=BusinessOut)
async def update_business(
    data: BusinessUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(business, key, value)
    await db.commit()
    await db.refresh(business)
    return business


@router.get("/agents")
async def get_agent_configs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AgentConfig).where(AgentConfig.business_id == current_user.business_id)
    )
    return result.scalars().all()


@router.post("/agents")
async def create_agent_config(
    agent_type: str,
    persona_name: str,
    persona_tone: str = "profesional",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config = AgentConfig(
        id=str(uuid.uuid4()),
        business_id=current_user.business_id,
        agent_type=agent_type,
        name=f"Agente {agent_type.capitalize()}",
        persona_name=persona_name,
        persona_tone=persona_tone,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


@router.post("/whatsapp/test")
async def test_whatsapp_send(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Envia un mensaje de WhatsApp de prueba al numero del negocio.
    Usa Meta Cloud API si esta configurada, Twilio como fallback.
    """
    from app.config import settings

    result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(404, "Negocio no encontrado")
    if not business.whatsapp_phone:
        raise HTTPException(400, "Configura el numero de WhatsApp primero")

    test_msg = (
        f"Conexion exitosa con Agente de Ventas AI\n\n"
        f"El numero {business.whatsapp_phone} esta conectado correctamente.\n"
        f"Tu agente ya puede responder mensajes automaticamente.\n\n"
        f"Negocio: {business.name}"
    )

    # Ruta 2: Meta WhatsApp Business Cloud API (prioritaria)
    if business.meta_phone_number_id and business.meta_wa_token:
        from app.services.meta_whatsapp import meta_whatsapp_service
        ok = await meta_whatsapp_service.send_message(
            phone_number_id=business.meta_phone_number_id,
            to_phone=business.whatsapp_phone,
            message=test_msg,
            access_token=business.meta_wa_token,
        )
        if ok:
            return {"ok": True, "message": f"Mensaje enviado a {business.whatsapp_phone} via Meta Cloud API"}
        raise HTTPException(500, "No se pudo enviar el mensaje. Verifica el Phone Number ID y el Access Token.")

    # Ruta 1: Twilio (fallback / legado)
    if settings.twilio_account_sid and settings.twilio_auth_token:
        from app.services.whatsapp import whatsapp_service
        ok = await whatsapp_service.send_message(business.whatsapp_phone, test_msg)
        if ok:
            return {"ok": True, "message": f"Mensaje enviado a {business.whatsapp_phone} via Twilio"}
        raise HTTPException(500, "No se pudo enviar el mensaje. Verifica las credenciales de Twilio.")

    raise HTTPException(
        400,
        "Configura el Phone Number ID y Access Token de Meta (o credenciales Twilio como alternativa).",
    )
