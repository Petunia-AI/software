"""
Servicio de WhatsApp Business API via Twilio.
Envía y recibe mensajes de WhatsApp.
"""
from app.config import settings
import structlog

logger = structlog.get_logger()


class WhatsAppService:
    def __init__(self):
        self._client = None
        self._validator = None
        self.from_number = settings.twilio_whatsapp_from

    def _get_client(self):
        if self._client is None:
            if not settings.twilio_account_sid or not settings.twilio_auth_token:
                raise RuntimeError("Twilio credentials not configured")
            from twilio.rest import Client
            self._client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        return self._client

    def _get_validator(self):
        if self._validator is None:
            from twilio.request_validator import RequestValidator
            self._validator = RequestValidator(settings.twilio_auth_token)
        return self._validator

    async def send_message(self, to_phone: str, message: str) -> bool:
        """Envía un mensaje de WhatsApp."""
        try:
            if not to_phone.startswith("whatsapp:"):
                to_phone = f"whatsapp:{to_phone}"
            msg = self._get_client().messages.create(
                body=message,
                from_=self.from_number,
                to=to_phone,
            )
            logger.info("whatsapp_sent", sid=msg.sid, to=to_phone)
            return True
        except Exception as e:
            logger.error("whatsapp_send_error", error=str(e), to=to_phone)
            return False

    def validate_webhook(self, url: str, params: dict, signature: str) -> bool:
        """Valida que el webhook viene de Twilio."""
        try:
            return self._get_validator().validate(url, params, signature)
        except Exception:
            return False

    def parse_incoming_message(self, form_data: dict) -> dict:
        """Parsea un mensaje entrante de Twilio/WhatsApp."""
        return {
            "from_number": form_data.get("From", "").replace("whatsapp:", ""),
            "to_number": form_data.get("To", "").replace("whatsapp:", ""),
            "body": form_data.get("Body", ""),
            "message_sid": form_data.get("MessageSid", ""),
            "num_media": int(form_data.get("NumMedia", 0)),
            "media_url": form_data.get("MediaUrl0"),
            "profile_name": form_data.get("ProfileName", ""),
        }


whatsapp_service = WhatsAppService()
