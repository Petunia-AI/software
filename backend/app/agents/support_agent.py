from typing import List, Dict, Any, Optional
from app.agents.base_agent import BaseAgent
import structlog

logger = structlog.get_logger()


class SupportAgent(BaseAgent):
    """
    Agente de soporte post-venta. Resuelve dudas, detecta upsell y escala issues.
    """

    def __init__(self):
        super().__init__()
        self.agent_type = "support"
        self.temperature = 0.3
        self.max_tokens = 1024

    def _build_system_prompt(
        self,
        business: Dict,
        lead: Dict,
        agent_config: Optional[Dict] = None,
    ) -> str:
        persona_name = (agent_config or {}).get("persona_name", "Valentina")
        business_ctx = self._build_business_context(business)

        return f"""Eres {persona_name}, especialista de soporte técnico y Customer Success en {business.get('name', 'la empresa')}.

Escribes en español. Eres precisa, empática y resolutiva.

=== CONTEXTO DEL NEGOCIO ===
{business_ctx}

=== DATOS DEL CLIENTE ===
Nombre: {lead.get('name', 'Cliente')}
Empresa: {lead.get('company', 'N/A')}

=== TU MISIÓN ===
1. Resolver el problema del cliente en el menor tiempo posible
2. Ser empática antes de ser técnica ("Entiendo tu frustración...")
3. Documentar el issue claramente
4. Detectar oportunidades de upsell orgánicamente
5. Escalar a humano si: el cliente está muy molesto, el issue es complejo o requiere acceso a sistemas

=== FAQs Y SOLUCIONES ===
{business.get('faqs', {})}

=== CRITERIOS DE ESCALAMIENTO ===
Escala a humano cuando:
- El cliente menciona cancelar o estar muy insatisfecho
- El problema lleva más de 2 mensajes sin resolverse
- Requiere acceso a datos internos del cliente
- Es un tema legal, de pagos o contractual

=== DETECCIÓN DE UPSELL ===
Cuando el cliente:
- Pregunta por features que no tiene → ofrece upgrade
- Menciona que necesita más capacidad/usuarios → expande plan
- Está muy contento → pide referidos

Siempre resuelve primero, vende después."""

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

    async def should_escalate(self, message: str) -> bool:
        """Determina si se debe escalar a un humano."""
        system = """Determina si el siguiente mensaje de un cliente requiere escalamiento a un agente humano.
Escala cuando hay: molestia extrema, amenaza de cancelación, tema legal/financiero, problema técnico complejo.
Responde ÚNICAMENTE: "ESCALAR" o "CONTINUAR"."""

        messages = [{"role": "user", "content": message}]

        try:
            response = await self.generate_response(system, messages, temperature=0.1, max_tokens=10)
            return "ESCALAR" in response.upper()
        except Exception:
            return False
