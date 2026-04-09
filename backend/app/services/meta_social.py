"""
Meta Social Messaging service.
Maneja envío de mensajes via:
  - Instagram DMs (Graph API /{ig_account_id}/messages)
  - Facebook Messenger (Graph API /{page_id}/messages)

El Page Access Token cubre ambos canales cuando pertenece a la misma Facebook App
con los permisos instagram_manage_messages + pages_messaging.
"""
import httpx
import structlog

logger = structlog.get_logger()

META_GRAPH_URL = "https://graph.facebook.com/v19.0"


class MetaSocialService:

    async def send_instagram_dm(
        self,
        ig_account_id: str,
        recipient_id: str,
        message: str,
        access_token: str,
    ) -> bool:
        """
        Envía un DM de Instagram vía Graph API.
        ig_account_id: Instagram Business Account ID (el de la página, no el del usuario)
        recipient_id: IGSID del usuario que envió el mensaje
        """
        url = f"{META_GRAPH_URL}/{ig_account_id}/messages"
        return await self._post_message(url, recipient_id, message, access_token, channel="instagram")

    async def send_messenger(
        self,
        page_id: str,
        recipient_psid: str,
        message: str,
        access_token: str,
    ) -> bool:
        """
        Envía un mensaje de Messenger vía Graph API.
        page_id: Facebook Page ID
        recipient_psid: Page-Scoped User ID del usuario
        """
        url = f"{META_GRAPH_URL}/{page_id}/messages"
        return await self._post_message(url, recipient_psid, message, access_token, channel="messenger")

    async def _post_message(
        self,
        url: str,
        recipient_id: str,
        message: str,
        access_token: str,
        channel: str = "meta",
    ) -> bool:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.post(
                    url,
                    json={
                        "recipient": {"id": recipient_id},
                        "message": {"text": message},
                        "messaging_type": "RESPONSE",
                    },
                    params={"access_token": access_token},
                )
                if r.status_code == 200:
                    logger.info(f"{channel}_reply_sent", recipient=recipient_id)
                    return True
                else:
                    logger.error(
                        f"{channel}_reply_error",
                        status=r.status_code,
                        body=r.text,
                        recipient=recipient_id,
                    )
                    return False
        except Exception as e:
            logger.error(f"{channel}_reply_exception", error=str(e))
            return False

    async def get_page_info(self, page_id: str, access_token: str) -> dict:
        """
        Obtiene información de una Página de Facebook.
        Útil para verificar que el token es válido y tiene acceso a la página.
        """
        url = f"{META_GRAPH_URL}/{page_id}"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(
                    url,
                    params={
                        "fields": "name,id,instagram_business_account",
                        "access_token": access_token,
                    },
                )
                if r.status_code == 200:
                    return r.json()
                return {}
        except Exception:
            return {}


meta_social_service = MetaSocialService()
