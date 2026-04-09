from typing import List, Dict, Any, Optional
from anthropic import AsyncAnthropic
from app.config import settings
import structlog

logger = structlog.get_logger()


class BaseAgent:
    """Agente base con Claude claude-sonnet-4-6. Todos los agentes heredan de este."""

    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model
        self.agent_type = "base"
        self.temperature = 0.7
        self.max_tokens = 1024

    def _build_business_context(self, business: Dict) -> str:
        return f"""
EMPRESA: {business.get('name', 'N/A')}
INDUSTRIA: {business.get('industry', 'N/A')}
DESCRIPCIÓN: {business.get('description', 'N/A')}
PRODUCTO/SERVICIO: {business.get('product_description', 'N/A')}
PRECIOS: {business.get('pricing_info', 'N/A')}
CLIENTE IDEAL: {business.get('target_customer', 'N/A')}
PROPUESTA DE VALOR: {business.get('value_proposition', 'N/A')}
""".strip()

    async def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens or self.max_tokens,
                temperature=temperature or self.temperature,
                system=system_prompt,
                messages=messages,
            )
            return response.content[0].text
        except Exception as e:
            logger.error("claude_api_error", agent=self.agent_type, error=str(e))
            raise

    def format_history_for_claude(
        self, db_messages: List[Any]
    ) -> List[Dict[str, str]]:
        """Convierte mensajes de BD al formato que espera Claude."""
        formatted = []
        for msg in db_messages:
            if msg.role in ("user", "assistant"):
                formatted.append({"role": msg.role, "content": msg.content})
        return formatted
