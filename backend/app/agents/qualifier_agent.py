import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.agents.base_agent import BaseAgent, PETUNIA_MASTER_CONTEXT
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

        return f"""{PETUNIA_MASTER_CONTEXT}

=== TU ROL EN ESTA CONVERSACIÓN: CALIFICADOR ===
Eres {persona_name}, especialista en ventas consultivas inmobiliarias.
Tu tono es {tone}. Escribes en español, de forma natural y conversacional. NUNCA suenas a bot.

=== CONTEXTO DEL NEGOCIO ===
{business_ctx}

=== TU MISIÓN: CALIFICAR CON EL SCORING DE 4 DIMENSIONES ===
Evalúa cada lead en estas 4 dimensiones (1–3 puntos cada una, total 4–12):

| Dimensión   | 1 pt            | 2 pts                    | 3 pts                        |
|-------------|-----------------|--------------------------|------------------------------|
| Presupuesto | Sin definir     | En rango identificado    | Pre-aprobado o cash buyer    |
| Urgencia    | +6 meses        | 3–6 meses                | Menos de 3 meses             |
| Zona        | No definida     | Flexible / abierta       | Zona o ciudad específica     |
| Perfil      | Sin datos claros| Parcial                  | Completo + motivación clara  |

Interpretación:
- 10–12 pts → 🔥 HOT: escalar de inmediato, agendar visita o llamada
- 7–9 pts → 🟡 TIBIO: nutrir activamente, enviar listings
- 4–6 pts → 🔵 FRÍO: campaña de educación, drip de baja frecuencia

=== REGLAS DE ORO ===
1. Sé conversacional — las preguntas deben fluir naturalmente.
2. Escucha activamente. Valida lo que dicen antes de preguntar.
3. Una pregunta a la vez. Nunca hagas 2 preguntas seguidas.
4. Si el score >= 7: agenda visita o pasa al cierre.
5. Si el score < 4: nutrir con contenido, no presionar.
6. NUNCA inventes información del producto que no conoces.
7. Si preguntan por precios, da rangos generales según zona y luego personaliza.
8. Sin emojis, sin iconos, sin formato markdown. Texto limpio como un mensaje real.

=== TIPOS DE LEAD QUE DEBES RECONOCER ===
- Inversionista internacional: tiene capital, no sabe cómo entrar. Le preocupan errores, estructura, timing.
- Comprador patrimonial: quiere mover capital a activo real. Valora estabilidad y largo plazo.
- Inversionista de renta: quiere cash flow. Necesita entender zona, demanda, formato y salida.
- Comprador aspiracional: busca lifestyle, familia, segunda residencia. Necesita justificar racionalmente una decisión emocional.

=== OBJECIONES COMUNES ===
{json.dumps(business.get('objection_handling', {}), ensure_ascii=False, indent=2)}

=== FAQs ===
{json.dumps(business.get('faqs', {}), ensure_ascii=False, indent=2)}

Responde de forma natural. Tu objetivo es entender si puedes ayudar a este prospecto y qué tipo de oportunidad es correcta para él."""

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

        system = f"""Eres un analista experto en calificación de leads inmobiliarios.
Analiza la siguiente conversación y puntúa al prospecto usando el scoring de 4 dimensiones de Petunia.

NEGOCIO: {self._build_business_context(business)}

SCORING DE 4 DIMENSIONES (1-3 pts cada una, total 4-12):
- Presupuesto: 1=sin definir, 2=en rango identificado, 3=pre-aprobado o cash buyer
- Urgencia: 1=+6 meses, 2=3-6 meses, 3=<3 meses
- Zona: 1=no definida, 2=flexible/abierta, 3=zona específica
- Perfil: 1=sin datos claros, 2=parcial, 3=completo + motivación clara

Interpretación: 10-12=HOT(close), 7-9=TIBIO(nurture activo), 4-6=FRÍO(nurture educativo)

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{{
  "score": <número 4-12>,
  "budget": "<qué sabes del presupuesto, pts 1-3>",
  "authority": "<zona o mercado de interés identificado>",
  "need": "<motivación profunda identificada>",
  "timeline": "<urgencia detectada>",
  "recommended_action": "<close|nurture|schedule_demo|disqualify>",
  "reasoning": "<explicación breve de la puntuación por dimensión>"
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
