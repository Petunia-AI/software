import json
from typing import List, Dict, Any
from pydantic import BaseModel
from app.agents.base_agent import BaseAgent
import structlog

logger = structlog.get_logger()


class ConversationInsight(BaseModel):
    sentiment_score: float      # -1 a 1
    dominant_intent: str        # buy, complain, inquire, compare, reject
    key_topics: List[str]
    objections_raised: List[str]
    buying_signals: List[str]
    recommended_next_action: str
    confidence: float


class AnalystAgent(BaseAgent):
    """
    Agente analista (no customer-facing). Analiza conversaciones y genera insights
    para mejorar el performance de los otros agentes.
    """

    def __init__(self):
        super().__init__()
        self.agent_type = "analyst"
        self.temperature = 0.1
        self.max_tokens = 2048

    async def analyze_conversation(
        self, conversation_history: List[Any], business: Dict
    ) -> ConversationInsight:
        """Analiza una conversación completa y extrae insights."""

        history_text = "\n".join(
            [f"{m.role.upper()}: {m.content}" for m in conversation_history]
        )

        system = f"""Eres un analista experto en conversaciones de ventas. Analiza la conversación y extrae insights clave.

NEGOCIO: {self._build_business_context(business)}

Devuelve ÚNICAMENTE un JSON con esta estructura:
{{
  "sentiment_score": <float -1.0 a 1.0, donde -1=muy negativo, 0=neutral, 1=muy positivo>,
  "dominant_intent": "<buy|complain|inquire|compare|reject|undefined>",
  "key_topics": ["<tema1>", "<tema2>"],
  "objections_raised": ["<objeción1>", "<objeción2>"],
  "buying_signals": ["<señal1>", "<señal2>"],
  "recommended_next_action": "<descripción breve de qué hacer a continuación>",
  "confidence": <float 0.0 a 1.0>
}}"""

        messages = [{"role": "user", "content": f"Conversación:\n\n{history_text}"}]

        try:
            raw = await self.generate_response(system, messages, temperature=0.1, max_tokens=512)
            start = raw.find("{")
            end = raw.rfind("}") + 1
            data = json.loads(raw[start:end])
            return ConversationInsight(**data)
        except Exception as e:
            logger.error("analyst_error", error=str(e))
            return ConversationInsight(
                sentiment_score=0.0,
                dominant_intent="undefined",
                key_topics=[],
                objections_raised=[],
                buying_signals=[],
                recommended_next_action="Revisar manualmente",
                confidence=0.0,
            )

    async def generate_daily_report(
        self, conversations_data: List[Dict], business: Dict
    ) -> str:
        """Genera un reporte diario con insights y recomendaciones."""

        system = f"""Eres un analista de ventas senior. Genera un reporte ejecutivo conciso en español
basado en los datos de conversaciones del día para {business.get('name')}.

Incluye:
1. Métricas clave (# conversaciones, tasa de calificación, tasa de cierre)
2. Principales objeciones encontradas
3. Temas más frecuentes
4. Recomendaciones accionables para mañana

Sé conciso y enfocado en insights accionables, no en descripciones."""

        messages = [{"role": "user", "content": f"Datos del día:\n{json.dumps(conversations_data, ensure_ascii=False)}"}]

        return await self.generate_response(system, messages, temperature=0.2, max_tokens=1500)
