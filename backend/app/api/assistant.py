"""
Assistant API — Asistente de ayuda en la plataforma Petunia AI

POST /assistant/chat  — Responde preguntas sobre cómo usar Petunia
"""
from __future__ import annotations

import logging
from typing import List

from anthropic import AsyncAnthropic, APIStatusError, APIConnectionError
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.api.auth import get_current_user
from app.config import settings
from app.models.user import User

router = APIRouter(prefix="/assistant", tags=["assistant"])

SYSTEM_PROMPT = """Eres Petunia, la asistente virtual de ayuda dentro de la plataforma Petunia AI.
Petunia AI es una plataforma de ventas con IA para negocios inmobiliarios y otros sectores en LATAM.

Tu trabajo es ayudar a los usuarios de la plataforma a entender cómo usar las funciones disponibles.
Responde siempre en español, de manera clara, amigable y concisa.

FUNCIONES DE LA PLATAFORMA:

1. DASHBOARD
   - Muestra métricas: conversaciones activas, leads generados, tasa de conversión, score BANT.
   - Gráfica de conversaciones de los últimos 14 días.
   - Actividad reciente y rendimiento por agente.

2. CONVERSACIONES (/conversations)
   - Lista todas las conversaciones de tus canales conectados (WhatsApp, Instagram, Web, Email, etc.).
   - Puedes ver el historial, asignar agentes y ver el estado de cada conversación.
   - El agente IA responde automáticamente a los mensajes.

3. LEADS (/leads)
   - Lista de todos tus leads con su etapa (nuevo, calificado, propuesta, cierre, etc.).
   - Puedes filtrar por etapa, fuente y score BANT.
   - Vista kanban y tabla disponibles.
   - Se cargan 50 por página para mejor rendimiento.

4. CONTENIDO (/content)
   - Crea y programa posts para Instagram, Facebook, TikTok, LinkedIn y más.
   - La IA puede generar el texto del post según tu nicho.
   - Calendario visual de publicaciones programadas.
   - Conecta tus redes sociales a través de Zernio.

5. PROPIEDADES (/properties)
   - Administra tu catálogo de propiedades (para inmobiliarias).
   - Sube fotos, descripción, precio, ubicación.
   - El agente IA usa este catálogo para responder consultas.

6. REUNIONES (/meetings)
   - Programa reuniones de Google Meet o Zoom directamente desde la plataforma.
   - El agente puede generar resúmenes y presentaciones de las reuniones.
   - Conecta tu cuenta de Google Calendar o Zoom en Configuración.

7. CONFIGURACIÓN (/settings)
   - Configura el perfil de tu negocio.
   - Conecta canales: WhatsApp Business, Instagram, Facebook Messenger, Email, TikTok, LinkedIn.
   - Personaliza la personalidad y tono de tu agente IA.
   - Configura seguimientos automáticos (follow-ups).

8. CANALES DISPONIBLES
   - WhatsApp Business API
   - Instagram DMs
   - Facebook Messenger
   - Email (Gmail, SMTP)
   - Web Chat (widget embebido en tu sitio)
   - TikTok DMs
   - LinkedIn

9. AGENTES IA
   - Petunia tiene varios modos de agente: ventas, atención al cliente, calificación BANT.
   - Puedes configurar el nombre, tono y especialidad del agente en Configuración.

GUÍAS RÁPIDAS:
- Para conectar WhatsApp: Ve a Configuración → WhatsApp → Conectar con Meta Business.
- Para conectar redes sociales: Ve a Configuración → Redes Sociales → usa el botón de Zernio.
- Para importar leads: Ve a Leads → botón "Importar" (CSV).
- Para ver el widget de chat en tu web: Ve a Configuración → Widget Web → copia el código.
- Para agregar una propiedad: Ve a Propiedades → botón "Nueva propiedad".

Si el usuario pregunta algo que no está en la plataforma, dile amablemente que esa función no está disponible o sugiérele una alternativa dentro de la plataforma.
Nunca inventes funciones que no existen.
Sé breve: máximo 3-4 oraciones por respuesta, a menos que el usuario pida pasos detallados.
"""


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def assistant_chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="Asistente no disponible en este momento")

    if len(body.messages) == 0:
        raise HTTPException(status_code=400, detail="Sin mensajes")

    # Limit history to last 10 messages to avoid large token usage
    messages = body.messages[-10:]

    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    try:
        response = await client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{"role": m.role, "content": m.content} for m in messages],
        )
    except APIStatusError as e:
        logger.error("Anthropic API error: %s %s", e.status_code, e.message)
        raise HTTPException(status_code=503, detail="El asistente no está disponible en este momento")
    except APIConnectionError as e:
        logger.error("Anthropic connection error: %s", e)
        raise HTTPException(status_code=503, detail="El asistente no está disponible en este momento")
    except Exception as e:
        logger.error("Assistant unexpected error: %s", e)
        raise HTTPException(status_code=503, detail="El asistente no está disponible en este momento")

    reply = response.content[0].text if response.content else "Lo siento, no pude generar una respuesta."
    return ChatResponse(reply=reply)
