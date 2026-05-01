"""
Orquestador de agentes. Decide qué agente responde en cada conversación
basándose en el estado del lead, el score y el historial.
"""
from typing import List, Dict, Any, Tuple, Optional
from app.agents.qualifier_agent import QualifierAgent, BANTQualification
from app.agents.closer_agent import CloserAgent
from app.agents.nurturer_agent import NurturerAgent
from app.agents.support_agent import SupportAgent
from app.agents.analyst_agent import AnalystAgent, ConversationInsight
import structlog

logger = structlog.get_logger()

# Umbrales de decisión
CLOSE_SCORE_THRESHOLD = 9.0       # Score >= 9 → Closer (antes 7, ahora más exigente)
DISQUALIFY_THRESHOLD = 2.0        # Score < 2 → Descartar
NURTURE_THRESHOLD = 4.0           # Score 2-4 → Nurturing
MAX_CLOSE_ATTEMPTS = 3             # Si el Closer falla 3 veces → Nurturer
MIN_MESSAGES_TO_QUALIFY = 5       # Mínimo de mensajes del usuario antes de calificar


class AgentOrchestrator:
    def __init__(self):
        self.qualifier = QualifierAgent()
        self.closer = CloserAgent()
        self.nurturer = NurturerAgent()
        self.support = SupportAgent()
        self.analyst = AnalystAgent()

    async def process_message(
        self,
        user_message: str,
        conversation_history: List[Any],
        business: Dict,
        lead: Dict,
        agent_configs: Optional[Dict] = None,
    ) -> Tuple[str, str, Optional[BANTQualification]]:
        """
        Procesa un mensaje entrante y devuelve:
        - response: texto de respuesta
        - agent_type: qué agente respondió
        - qualification: calificación BANT actualizada (si aplica)
        """
        configs = agent_configs or {}
        current_agent = lead.get("assigned_agent_type", "qualifier")
        lead_stage = lead.get("stage", "new")
        score = float(lead.get("qualification_score", 0))

        logger.info(
            "routing_message",
            current_agent=current_agent,
            lead_stage=lead_stage,
            score=score,
        )

        # 1. Clientes existentes → Support
        if lead_stage in ("closed_won",):
            should_escalate = await self.support.should_escalate(user_message)
            if should_escalate:
                return (
                    "Voy a transferirte con un especialista ahora mismo. Un momento por favor. 🙏",
                    "escalated",
                    None,
                )
            response = await self.support.respond(
                conversation_history, business, lead, configs.get("support")
            )
            return response, "support", None

        # 2. Nurturer detecta señal de compra → pasar a Closer
        if current_agent == "nurturer":
            buying_signal = await self.nurturer.detect_buying_signal(
                user_message, conversation_history
            )
            if buying_signal:
                logger.info("buying_signal_detected", lead_id=lead.get("id"))
                response = await self.closer.respond(
                    conversation_history, business, lead, configs.get("closer")
                )
                return response, "closer", None
            response = await self.nurturer.respond(
                conversation_history, business, lead, configs.get("nurturer")
            )
            return response, "nurturer", None

        # 3. Closer activo
        if current_agent == "closer":
            close_attempts = await self.closer.detect_close_attempt_count(conversation_history)
            if close_attempts >= MAX_CLOSE_ATTEMPTS:
                # Demasiados intentos sin éxito → Nurturer
                response = await self.nurturer.respond(
                    conversation_history, business, lead, configs.get("nurturer")
                )
                return response, "nurturer", None
            response = await self.closer.respond(
                conversation_history, business, lead, configs.get("closer")
            )
            return response, "closer", None

        # 4. Qualifier (flujo principal)
        response = await self.qualifier.respond(
            conversation_history, business, configs.get("qualifier")
        )

        # 5. Re-calificar cada 3 mensajes del usuario, pero solo a partir del mínimo
        user_message_count = sum(1 for m in conversation_history if m.role == "user")
        qualification = None

        if user_message_count >= MIN_MESSAGES_TO_QUALIFY and user_message_count % 3 == 0:
            qualification = await self.qualifier.qualify(conversation_history, business)
            logger.info("lead_qualified", score=qualification.score, action=qualification.recommended_action)

        return response, "qualifier", qualification

    async def analyze_conversation(
        self,
        conversation_history: List[Any],
        business: Dict,
    ) -> ConversationInsight:
        """Analiza la conversación completa para insights."""
        return await self.analyst.analyze_conversation(conversation_history, business)

    def determine_next_agent(self, qualification: BANTQualification) -> str:
        """Dado un BANT, determina qué agente debe tomar la conversación."""
        if qualification.score >= CLOSE_SCORE_THRESHOLD:
            return "closer"
        elif qualification.score < DISQUALIFY_THRESHOLD:
            return "disqualified"
        elif qualification.score < NURTURE_THRESHOLD:
            return "nurturer"
        else:
            return "qualifier"
