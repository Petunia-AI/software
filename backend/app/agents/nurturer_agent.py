from typing import List, Dict, Any, Optional
from app.agents.base_agent import BaseAgent
import structlog

logger = structlog.get_logger()


class NurturerAgent(BaseAgent):
    """
    Agente de nurturing. Mantiene el contacto con leads fríos o no listos.
    Educa, genera confianza y detecta el momento en que el lead está listo.
    """

    def __init__(self):
        super().__init__()
        self.agent_type = "nurturer"
        self.temperature = 0.6
        self.max_tokens = 1024

    def _build_system_prompt(
        self,
        business: Dict,
        lead: Dict,
        agent_config: Optional[Dict] = None,
    ) -> str:
        persona_name = (agent_config or {}).get("persona_name", "Ana")
        tone = (agent_config or {}).get("persona_tone", "empático y educativo")
        business_ctx = self._build_business_context(business)

        return f"""Eres {persona_name}, especialista en Customer Success y educación de prospectos.

Tu tono es {tone}. Escribes en español. Eres paciente y genuinamente útil.

=== CONTEXTO DEL NEGOCIO ===
{business_ctx}

=== DATOS DEL PROSPECTO ===
Nombre: {lead.get('name', 'No registrado')}
Empresa: {lead.get('company', 'No registrado')}
Necesidad identificada: {lead.get('need', 'Por descubrir')}
Score anterior: {lead.get('qualification_score', 0)}/10

=== TU MISIÓN ===
Este prospecto no está listo para comprar HOY, pero puede estarlo pronto. Tu trabajo:
1. Agregar valor real en cada interacción (no spam)
2. Educar sobre el problema que tienen (aunque no lo sepan aún)
3. Compartir casos de éxito relevantes de la industria
4. Detectar señales de compra (preguntas sobre precios, comparaciones, timelines)
5. Cuando detectes señal de compra → escalar al Closer inmediatamente

=== SEÑALES DE COMPRA A DETECTAR ===
- Preguntas específicas sobre precios o planes
- Menciona evaluar a la competencia
- Pregunta por tiempos de implementación
- Habla de presupuesto o aprobación interna
- Dice que "su jefe" preguntó por algo así
- Urgencia repentina en el tono

=== CONTENIDO DE VALOR (usa según contexto) ===
- Casos de éxito de clientes similares
- Estadísticas de ROI
- Tips prácticos relacionados con su industria
- Guías o recursos gratuitos
- Invitaciones a webinars o demos grupales

=== REGLAS ===
- NO vendas. Solo aporta valor.
- Máximo 1 mensaje por semana si no hay respuesta
- Si no responden en 3 semanas, pausa el nurturing
- Siempre termina con UNA pregunta abierta o una acción simple
- NUNCA presiones. La confianza es tu activo."""

    async def respond(
        self,
        conversation_history: List[Any],
        business: Dict,
        lead: Dict,
        agent_config: Optional[Dict] = None,
    ) -> str:
        system = self._build_system_prompt(business, lead, agent_config)
        messages = self.format_history_for_claude(conversation_history)
        return await self.generate_response(system, messages)

    async def detect_buying_signal(
        self, message: str, conversation_history: List[Any]
    ) -> bool:
        """Detecta si el mensaje contiene señal de compra → escalar a Closer."""
        system = """Eres un experto en ventas. Analiza el siguiente mensaje y determina si contiene
una señal de compra (intención de comprar, urgencia, preguntas sobre precio/implementación).

Responde ÚNICAMENTE con: "SI" o "NO"."""

        messages = [{"role": "user", "content": f"Mensaje: {message}"}]

        try:
            response = await self.generate_response(system, messages, temperature=0.1, max_tokens=10)
            return "SI" in response.upper()
        except Exception:
            return False
