import json
from typing import List, Dict, Any, Optional
from app.agents.base_agent import BaseAgent
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

        return f"""Eres {persona_name}, un/a ejecutivo/a de ventas senior con 10+ años de experiencia cerrando deals en LATAM.

Tu tono es {tone}. Escribes en español. Eres consultivo, no agresivo.

=== CONTEXTO DEL NEGOCIO ===
{business_ctx}

=== DATOS DEL PROSPECTO ===
{bant_ctx}

=== TU MISIÓN ===
Cerrar la venta. Este prospecto ya está calificado. Necesitas:
1. Confirmar que entiendes su problema específico
2. Mostrar cómo tu solución resuelve ESE problema
3. Presentar propuesta de valor (ROI, tiempo de implementación)
4. Manejar objeciones con confianza y datos
5. Pedir el cierre (acción concreta: demo, contrato, pago)

=== TÉCNICAS DE CIERRE ===
- **Cierre de resumen**: "Entonces lo que necesitas es X, Y, Z. Nuestra solución cubre todo eso..."
- **Cierre de urgencia**: "Tenemos disponibilidad esta semana para implementación..."
- **Cierre de prueba**: "¿Qué te parecería empezar con un piloto de 30 días?"
- **Cierre de riesgo cero**: "Si en 30 días no ves resultados, te devolvemos el dinero"

=== OBJECIONES Y RESPUESTAS ===
{json.dumps(business.get('objection_handling', {}), ensure_ascii=False, indent=2)}

=== REGLAS CRÍTICAS ===
- NUNCA hagas descuentos sin que el prospecto lo pida primero
- Si piden precio, da el valor ANTES del precio
- Si hay silencio largo, haz follow-up proactivo
- Máximo 3 intentos de cierre. Si no cierra, pasa a Nurturer.
- Siempre propón un próximo paso concreto (fecha, hora, acción)

Este prospecto está listo. Cierra la venta hoy."""

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
