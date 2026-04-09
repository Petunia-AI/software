"""
Meta WhatsApp Business Cloud API service.
Envía mensajes de WhatsApp via Meta Graph API (no Twilio).
Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
"""
import hmac
import hashlib
import httpx
import structlog

logger = structlog.get_logger()

META_GRAPH_URL = "https://graph.facebook.com/v19.0"


class MetaWhatsAppService:

    async def send_message(
        self,
        phone_number_id: str,
        to_phone: str,
        message: str,
        access_token: str,
    ) -> bool:
        """
        Envía un mensaje de texto de WhatsApp via Meta Cloud API.

        Args:
            phone_number_id: El Phone Number ID de Meta (no el número en sí).
            to_phone: Número destinatario con código de país, sin '+'. Ej: 521234567890
            message: Texto del mensaje.
            access_token: Token permanente de sistema (System User Token).
        """
        # Limpiar número: quitar +, espacios y guiones
        to_clean = to_phone.lstrip("+").replace(" ", "").replace("-", "")

        url = f"{META_GRAPH_URL}/{phone_number_id}/messages"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    url,
                    json={
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": to_clean,
                        "type": "text",
                        "text": {"body": message, "preview_url": False},
                    },
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    },
                )
                if r.status_code == 200:
                    logger.info("meta_wa_sent", to=to_clean, phone_number_id=phone_number_id)
                    return True
                else:
                    logger.error(
                        "meta_wa_send_error",
                        status=r.status_code,
                        body=r.text,
                        to=to_clean,
                    )
                    return False
        except Exception as e:
            logger.error("meta_wa_send_exception", error=str(e))
            return False

    def verify_signature(self, payload: bytes, signature: str, app_secret: str) -> bool:
        """Verifica la firma HMAC-SHA256 que Meta adjunta a cada webhook."""
        if not signature.startswith("sha256="):
            return False
        expected = hmac.new(app_secret.encode(), payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(f"sha256={expected}", signature)

    async def get_phone_number_info(self, phone_number_id: str, access_token: str) -> dict:
        """
        Obtiene información sobre un Phone Number ID registrado en Meta.
        Útil para verificar que las credenciales son correctas.
        """
        url = f"{META_GRAPH_URL}/{phone_number_id}"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    url,
                    params={"fields": "display_phone_number,verified_name,quality_rating"},
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if r.status_code == 200:
                    return r.json()
                return {}
        except Exception:
            return {}


meta_whatsapp_service = MetaWhatsAppService()
