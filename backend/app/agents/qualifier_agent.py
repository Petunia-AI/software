import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.agents.base_agent import BaseAgent
import structlog

logger = structlog.get_logger()


class BANTQualification(BaseModel):
    score: float  # 0-10
    budget: str
    authority: str
    need: str
    timeline: str
    recommended_action: str  # "close", "nurture", "disqualify", "schedule_demo"
    reasoning: str


class QualifierAgent(BaseAgent):
    """
    Agente calificador. Identifica si el lead es apto usando BANT.
    Temperatura baja = respuestas consistentes y estructuradas.
    """

    def __init__(self):
        super().__init__()
        self.agent_type = "qualifier"
        self.temperature = 0.3
        self.max_tokens = 2048

    def _build_system_prompt(self, business: Dict, agent_config: Optional[Dict] = None) -> str:
        persona_name = (agent_config or {}).get("persona_name", "Sofía")
        tone = (agent_config or {}).get("persona_tone", "amigable y profesional")

        business_ctx = self._build_business_context(business)

        return f"""Eres {persona_name}, un/a especialista en ventas consultivas experto/a en calificación de prospectos.

Tu tono es {tone}. Escribes en español, de forma natural y conversacional. NUNCA suenas a bot.

=== CONTEXTO DEL NEGOCIO ===
{business_ctx}

=== TU MISIÓN ===
Calificar prospectos usando el framework BANT:
- BUDGET: ¿Tienen presupuesto disponible?
- AUTHORITY: ¿Hablas con quien toma decisiones?
- NEED: ¿Qué dolor específico tienen? ¿Qué tan urgente?
- TIMELINE: ¿Cuándo necesitan implementar?

=== REGLAS DE ORO ===
1. Sé conversacional. Las preguntas deben fluir naturalmente.
2. Escucha activamente. Valida lo que dicen antes de preguntar.
3. Una pregunta a la vez. Nunca hagas 2 preguntas seguidas.
4. Si el score >= 7: agenda una demo o pasa al cierre.
5. Si el score < 4: nutrir con contenido, no insistir.
6. NUNCA inventes información del producto que no conoces.
7. Si preguntan por precios, da rangos generales y luego personaliza.
8. Usa emojis con moderación en WhatsApp, evítalos en correo.

=== OBJECIONES COMUNES ===
{json.dumps(business.get('objection_handling', {}), ensure_ascii=False, indent=2)}

=== FAQs ===
{json.dumps(business.get('faqs', {}), ensure_ascii=False, indent=2)}

Responde de forma natural. Tu objetivo hoy es entender si puedes ayudar a este prospecto."""

    async def respond(
        self,
        conversation_history: List[Any],
        business: Dict,
        agent_config: Optional[Dict] = None,
    ) -> str:
        system = self._build_system_prompt(business, agent_config)
        messages = self.format_history_for_claude(conversation_history)

        if not messages:
            messages = [{"role": "user", "content": "Hola"}]

        return await self.generate_response(system, messages)

    async def qualify(
        self,
        conversation_history: List[Any],
        business: Dict,
    ) -> BANTQualification:
        """Analiza la conversación completa y devuelve puntuación BANT en JSON."""

        history_text = "\n".join(
            [f"{m.role.upper()}: {m.content}" for m in conversation_history]
        )

        system = f"""Eres un analista experto en calificación de ventas B2B.
Analiza la siguiente conversación y extrae la calificación BANT del prospecto.

NEGOCIO: {self._build_business_context(business)}

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{{
  "score": <número 0-10>,
  "budget": "<qué sabes del presupuesto, o 'desconocido'>",
  "authority": "<rol del contacto y nivel de decisión>",
  "need": "<dolor o necesidad identificada>",
  "timeline": "<cuándo quieren implementar>",
  "recommended_action": "<close|nurture|schedule_demo|disqualify>",
  "reasoning": "<explicación breve de la puntuación>"
}}"""

        messages = [{"role": "user", "content": f"Conversación a analizar:\n\n{history_text}"}]

        try:
            raw = await self.generate_response(system, messages, temperature=0.1, max_tokens=512)
            # Extraer JSON limpio
            start = raw.find("{")
            end = raw.rfind("}") + 1
            data = json.loads(raw[start:end])
            return BANTQualification(**data)
        except Exception as e:
            logger.error("qualification_error", error=str(e))
            return BANTQualification(
                score=0,
                budget="desconocido",
                authority="desconocido",
                need="desconocido",
                timeline="desconocido",
                recommended_action="nurture",
                reasoning="Error al procesar la calificación",
            )
