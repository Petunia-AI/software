"""
Zernio Social Media Service.

Zernio actúa como capa intermedia de redes sociales.
Petunia usa un único API Key y crea un Profile por cada cliente.
El cliente vincula sus redes una a una mediante URLs de OAuth individuales.

Flow por plataforma:
1. POST /v1/profiles          → crea perfil, devuelve _id (profileId)
2. GET  /v1/connect/{platform}?profileId=xxx  → URL OAuth para vincular esa red
3. GET  /v1/accounts          → lista cuentas conectadas del perfil
4. POST /v1/posts             → publica en nombre del cliente

Base URL: https://zernio.com/api/v1
Documentación: https://docs.zernio.com/
"""
import httpx
from app.config import settings
import structlog

logger = structlog.get_logger()

ZERNIO_BASE = "https://zernio.com/api/v1"

# Plataformas soportadas por Zernio con su nombre de display
ZERNIO_PLATFORMS: dict[str, str] = {
    "twitter":       "X / Twitter",
    "instagram":     "Instagram",
    "facebook":      "Facebook",
    "linkedin":      "LinkedIn",
    "tiktok":        "TikTok",
    "youtube":       "YouTube",
    "pinterest":     "Pinterest",
    "reddit":        "Reddit",
    "bluesky":       "Bluesky",
    "threads":       "Threads",
    "googlebusiness": "Google Business",
    "telegram":      "Telegram",
    "snapchat":      "Snapchat",
    "whatsapp":      "WhatsApp",
    "discord":       "Discord",
}

# Plataformas con soporte de DMs / inbox (Zernio Inbox add-on)
DM_SUPPORTED = {"facebook", "instagram", "twitter", "bluesky", "reddit", "telegram", "whatsapp"}

# Plataformas con soporte de comentarios
COMMENT_SUPPORTED = {"facebook", "instagram", "twitter", "bluesky", "threads", "reddit", "youtube", "linkedin"}


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.zernio_api_key}",
        "Content-Type": "application/json",
    }


class ZernioService:

    # ── Profiles ──────────────────────────────────────────────────────────────

    async def create_profile(self, name: str, description: str = "") -> dict:
        """Crea un perfil de negocio en Zernio. Devuelve el objeto profile con _id."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{ZERNIO_BASE}/profiles",
                headers=_headers(),
                json={"name": name, "description": description},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("profile", data)

    async def get_profile(self, profile_id: str) -> dict:
        """Obtiene un perfil por su ID."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{ZERNIO_BASE}/profiles/{profile_id}",
                headers=_headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("profile", data)

    async def delete_profile(self, profile_id: str) -> bool:
        """Elimina un perfil de Zernio."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.delete(
                f"{ZERNIO_BASE}/profiles/{profile_id}",
                headers=_headers(),
            )
            return resp.status_code < 300

    # ── Conexión OAuth por plataforma ─────────────────────────────────────────

    async def get_connect_url(self, platform: str, profile_id: str, redirect_url: str | None = None) -> str:
        """
        Obtiene la URL de OAuth para que el cliente vincule una plataforma específica.
        El cliente abre esta URL en su navegador para autorizar.

        GET /v1/connect/{platform}?profileId=xxx&redirect_url=yyy
        """
        params: dict = {"profileId": profile_id}
        if redirect_url:
            params["redirect_url"] = redirect_url
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{ZERNIO_BASE}/connect/{platform}",
                headers=_headers(),
                params=params,
            )
            if not resp.is_success:
                body = ""
                try:
                    body = resp.json()
                except Exception:
                    body = resp.text
                raise httpx.HTTPStatusError(
                    f"Zernio {resp.status_code} para {platform}: {body}",
                    request=resp.request,
                    response=resp,
                )
            data = resp.json()
            url = data.get("authUrl") or data.get("url") or data.get("connectUrl")
            if not url:
                raise ValueError(f"Zernio no devolvió una URL de conexión para {platform}: {data}")
            return url

    # ── Cuentas conectadas ────────────────────────────────────────────────────

    async def list_accounts(self, profile_id: str) -> list[dict]:
        """
        Lista todas las cuentas de redes sociales vinculadas a un perfil.
        Devuelve lista de objetos: [{_id, platform, username, ...}]
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{ZERNIO_BASE}/accounts",
                headers=_headers(),
                params={"profileId": profile_id},
            )
            resp.raise_for_status()
            data = resp.json()
            accounts = data.get("accounts", data) if isinstance(data, dict) else data
            return accounts if isinstance(accounts, list) else []

    async def get_connected_platforms(self, profile_id: str) -> list[dict]:
        """
        Devuelve lista de plataformas conectadas en formato:
        [{"platform": "instagram", "accountId": "acc_xxx", "username": "@marca"}]
        """
        try:
            accounts = await self.list_accounts(profile_id)
            result = []
            for acc in accounts:
                platform = acc.get("platform", "").lower()
                if platform:
                    result.append({
                        "platform": platform,
                        "accountId": acc.get("_id") or acc.get("id", ""),
                        "username": acc.get("username") or acc.get("name") or "",
                    })
            return result
        except Exception as e:
            logger.warning("zernio_get_connected_platforms_failed", error=str(e))
            return []

    async def disconnect_account(self, account_id: str) -> bool:
        """Desconecta una cuenta de red social específica."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.delete(
                f"{ZERNIO_BASE}/accounts/{account_id}",
                headers=_headers(),
            )
            return resp.status_code < 300

    # ── Publicar ──────────────────────────────────────────────────────────────

    async def post(
        self,
        profile_id: str,
        text: str,
        platform_accounts: list[dict],
        media_urls: list[str] | None = None,
        scheduled_date: str | None = None,
        publish_now: bool = False,
    ) -> dict:
        """
        Publica contenido en una o varias redes sociales.

        platform_accounts: lista de dicts con {"platform": "instagram", "accountId": "acc_xxx"}
        scheduled_date: ISO 8601 string para programar (opcional)
        publish_now: True para publicar inmediatamente

        Nota: TikTok e Instagram requieren mediaUrls (imagen/video) obligatorio.
        """
        requires_media = {"instagram"}
        requires_video = {"tiktok"}

        filtered_accounts = list(platform_accounts)

        if not media_urls:
            filtered_accounts = [
                a for a in filtered_accounts
                if a["platform"] not in requires_media and a["platform"] not in requires_video
            ]
        else:
            is_video = any(
                url.lower().endswith((".mp4", ".mov", ".avi", ".webm"))
                for url in media_urls
            )
            if not is_video:
                filtered_accounts = [
                    a for a in filtered_accounts if a["platform"] not in requires_video
                ]

        if not filtered_accounts:
            logger.warning("zernio_post_skipped_no_valid_platforms")
            return {"skipped": True, "reason": "TikTok solo acepta videos (mp4/mov). Instagram requiere imagen o video."}

        body: dict = {
            "content": text,
            "platforms": filtered_accounts,
        }
        if media_urls:
            body["mediaUrls"] = media_urls
        if publish_now:
            body["publishNow"] = True
        elif scheduled_date:
            body["scheduledFor"] = scheduled_date

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{ZERNIO_BASE}/posts",
                headers=_headers(),
                json=body,
            )
            if not resp.is_success:
                error_body = resp.text[:1000]
                logger.error(
                    "zernio_post_error",
                    status=resp.status_code,
                    body=error_body,
                    platforms=[a["platform"] for a in filtered_accounts],
                )
                raise httpx.HTTPStatusError(
                    f"Zernio {resp.status_code}: {error_body}",
                    request=resp.request,
                    response=resp,
                )
            data = resp.json()
            return data.get("post", data)

    # ── Mensajes directos (DMs) ───────────────────────────────────────────────

    async def list_conversations(self, profile_id: str, platform: str | None = None) -> list[dict]:
        """Lista conversaciones del inbox."""
        params: dict = {"profileId": profile_id}
        if platform:
            params["platform"] = platform
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{ZERNIO_BASE}/messages/conversations",
                headers=_headers(),
                params=params,
            )
            if not resp.is_success:
                logger.warning("zernio_list_conversations_failed", status=resp.status_code)
                return []
            data = resp.json()
            return data.get("conversations", []) if isinstance(data, dict) else data

    async def send_message(
        self,
        account_id: str,
        platform: str,
        recipient_id: str,
        message: str,
    ) -> dict:
        """
        Envía un mensaje directo a un usuario.
        account_id: _id de la cuenta conectada (no el profileId)
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{ZERNIO_BASE}/messages",
                headers=_headers(),
                json={
                    "accountId": account_id,
                    "platform": platform,
                    "recipientId": recipient_id,
                    "message": message,
                },
            )
            if resp.status_code >= 400:
                logger.warning(
                    "zernio_send_message_failed",
                    platform=platform,
                    status=resp.status_code,
                    body=resp.text[:300],
                )
                return {"ok": False, "error": resp.text}
            return {"ok": True, **resp.json()}

    # ── Comentarios ───────────────────────────────────────────────────────────

    async def list_comments(self, profile_id: str, platform: str | None = None) -> list[dict]:
        """Lista comentarios del inbox."""
        params: dict = {"profileId": profile_id}
        if platform:
            params["platform"] = platform
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{ZERNIO_BASE}/comments",
                headers=_headers(),
                params=params,
            )
            if not resp.is_success:
                logger.warning("zernio_list_comments_failed", status=resp.status_code)
                return []
            data = resp.json()
            return data.get("comments", []) if isinstance(data, dict) else data

    async def reply_to_comment(
        self,
        comment_id: str,
        platform: str,
        text: str,
    ) -> dict:
        """Responde a un comentario existente."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{ZERNIO_BASE}/comments/{comment_id}/reply",
                headers=_headers(),
                json={"platform": platform, "text": text},
            )
            if resp.status_code >= 400:
                logger.warning(
                    "zernio_reply_failed",
                    comment_id=comment_id[:20],
                    status=resp.status_code,
                    body=resp.text[:300],
                )
                return {"ok": False, "error": resp.text}
            return {"ok": True, **resp.json()}

    # ── Webhooks ──────────────────────────────────────────────────────────────

    async def register_webhook(self, webhook_url: str, events: list[str] | None = None) -> dict:
        """
        Registra o actualiza la URL de webhook en Zernio.
        events: lista de eventos a suscribir (None = todos)
        """
        body: dict = {"url": webhook_url}
        if events:
            body["events"] = events
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{ZERNIO_BASE}/webhooks",
                headers=_headers(),
                json=body,
            )
            if resp.status_code >= 400:
                raise Exception(f"Zernio error {resp.status_code}: {resp.text}")
            return resp.json()

    # ── Analytics ─────────────────────────────────────────────────────────────

    async def get_analytics(self, account_id: str, platform: str) -> dict:
        """Obtiene métricas de una cuenta."""
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{ZERNIO_BASE}/analytics",
                headers=_headers(),
                params={"accountId": account_id, "platform": platform},
            )
            if not resp.is_success:
                return {}
            return resp.json()


zernio_service = ZernioService()
