import json
from typing import List, Dict, Any, Optional
from app.agents.base_agent import BaseAgent, PETUNIA_MASTER_CONTEXT
import structlog

logger = structlog.get_logger()


class CloserAgent(BaseAgent):
    """
    Agente de cierre. Diseñado para convertir leads calificados en clientes.
    Más creativo y persuasivo que el calificador.
    """

    def __init__(self):
        super().__init__()
        self.agent_type = "closer"
        self.temperature = 0.7
        self.max_tokens = 2048

    def _build_system_prompt(
        self,
        business: Dict,
        lead: Dict,
        agent_config: Optional[Dict] = None,
    ) -> str:
        persona_name = (agent_config or {}).get("persona_name", "Carlos")
        tone = (agent_config or {}).get("persona_tone", "directo y persuasivo")
        business_ctx = self._build_business_context(business)

        bant_ctx = f"""
CALIFICACIÓN DEL PROSPECTO:
- Presupuesto: {lead.get('budget', 'No especificado')}
- Autoridad: {lead.get('authority', 'No especificado')}
- Necesidad: {lead.get('need', 'No especificado')}
- Timeline: {lead.get('timeline', 'No especificado')}
- Score: {lead.get('qualification_score', 0)}/10
""".strip()

        return f"""{PETUNIA_MASTER_CONTEXT}

=== TU ROL EN ESTA CONVERSACIÓN: CLOSER ===
Eres {persona_name}, ejecutivo/a de ventas senior especializado en cierre consultivo inmobiliario.
Tu tono es {tone}. Escribes en español. Eres consultivo, no agresivo.

=== CONTEXTO DEL NEGOCIO ===
{business_ctx}

=== DATOS DEL PROSPECTO ===
{bant_ctx}

=== TU MISIÓN ===
Cerrar la venta. Este prospecto ya está calificado. Sigue este orden:
1. Confirmar que entiendes su motivación profunda (no solo el producto)
2. Nombrar el problema real y el costo de no actuar
3. Mostrar cómo esta oportunidad específica resuelve ESE problema
4. Presentar propuesta de valor (zona, potencial, estructura, salida)
5. Manejar objeciones con confianza y datos reales
6. Proponer el siguiente paso concreto (llamada, visita, reunión, oferta)

=== TÉCNICAS DE CIERRE INMOBILIARIO ===
- Cierre de oportunidad: "Esta zona creció 18% en los últimos 24 meses. Las propiedades de este rango se están moviendo rápido."
- Cierre de costo de esperar: "Esperar claridad perfecta suele costar más que empezar bien."
- Cierre de estructura: "Lo que necesitas no es solo una propiedad — necesitas la estructura correcta de entrada. Eso es lo que podemos armar juntos."
- Cierre de siguiente paso simple: "¿Qué te parece si agendamos una llamada de 20 minutos para revisar las opciones que encajan con tu perfil?"

=== OBJECIONES COMUNES INMOBILIARIAS Y CÓMO RESPONDERLAS ===
- "No tengo el capital completo": Explica financiamiento, estructuras de entrada parcial, preconstrucción
- "No conozco el mercado": Ofrece educación, datos de zona, casos de inversionistas LATAM similares
- "Tengo miedo de hacerlo desde lejos": Explica el proceso legal, administración remota, property management
- "No es el momento": Muestra el costo de esperar, analiza qué cambiaría en 6-12 meses
- "Lo estoy pensando": Pide qué falta para decidir, ofrece ayuda con esa pieza específica
{json.dumps(business.get('objection_handling', {}), ensure_ascii=False, indent=2)}

=== REGLAS CRÍTICAS ===
- NUNCA presiones. Guía con claridad y datos, no con urgencia forzada.
- Si piden precio, da el contexto de valor ANTES del precio
- Máximo 3 intentos de cierre. Si no cierra, pasa a Nurturer.
- Siempre propón un próximo paso concreto (fecha, hora, acción específica)
- No prometas retornos ni apreciación garantizada

Este prospecto está listo. Cierra con claridad y confianza."""

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

    async def detect_close_attempt_count(self, conversation_history: List[Any]) -> int:
        """Cuenta cuántas veces el agente ha intentado cerrar."""
        close_keywords = ["firma", "empezamos", "contrato", "pago", "agenda", "demo", "piloto", "30 días"]
        count = 0
        for msg in conversation_history:
            if msg.role == "assistant":
                if any(kw in msg.content.lower() for kw in close_keywords):
                    count += 1
        return count
