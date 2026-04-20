"""
Ayrshare Auto Global OAuth Service.

Ayrshare actúa como capa intermedia de redes sociales.
Petunia usa un único API Key (Business plan) y crea un perfil
por cada cliente (profileKey). El cliente vincula sus redes
a través de una URL JWT generada por el endpoint generateJWT de Ayrshare.

Flow Auto Global:
1. POST /profiles/profile          → crea perfil, devuelve profileKey
2. POST /profiles/generateJWT      → genera URL JWT para que el cliente vincule sus redes
3. GET  /user  (con Profile-Key)   → consulta redes vinculadas
4. POST /post  (con Profile-Key)   → publica en nombre del cliente

Documentación: https://www.ayrshare.com/docs/introduction
"""
import httpx
from app.config import settings
import structlog

logger = structlog.get_logger()

AYRSHARE_BASE = "https://api.ayrshare.com/api"


def _headers(profile_key: str | None = None) -> dict:
    h = {
        "Authorization": f"Bearer {settings.ayrshare_api_key}",
        "Content-Type": "application/json",
    }
    if profile_key:
        h["Profile-Key"] = profile_key
    return h


class AyrshareService:

    # ── Profiles ──────────────────────────────────────────────────────────────

    async def create_profile(self, ref_id: str, title: str) -> dict:
        """Crea un perfil de usuario en Ayrshare. Devuelve profileKey."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{AYRSHARE_BASE}/profiles/profile",
                headers=_headers(),
                json={"refId": ref_id, "title": title},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_profile(self, profile_key: str | None) -> dict:
        """Obtiene información del perfil incluyendo redes conectadas."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{AYRSHARE_BASE}/user",
                headers=_headers(profile_key),
            )
            resp.raise_for_status()
            return resp.json()

    async def delete_profile(self, profile_key: str) -> bool:
        """Elimina un perfil de Ayrshare."""
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.delete(
                f"{AYRSHARE_BASE}/profiles/profile",
                headers=_headers(),
                json={"profileKey": profile_key},
            )
            return resp.status_code < 300

    # ── JWT para Auto Global OAuth ────────────────────────────────────────────

    async def generate_jwt_url(self, profile_key: str) -> str:
        """
        Llama al endpoint generateJWT de Ayrshare para obtener la URL
        que el cliente abre en el navegador para vincular sus redes sociales.

        Ayrshare firma el JWT en sus servidores usando el privateKey.
        La URL resultante es válida por 5 minutos.

        Endpoint: POST /api/profiles/generateJWT  (form-urlencoded)
        """
        if not settings.ayrshare_jwt_secret:
            raise ValueError(
                "AYRSHARE_JWT_SECRET no está configurado. "
                "Descárgalo desde Ayrshare Dashboard → Settings → JWT."
            )
        if not settings.ayrshare_domain:
            raise ValueError("AYRSHARE_DOMAIN no está configurado.")

        # El .env guarda el PEM con \n literales — restaurar saltos de línea reales
        private_key = settings.ayrshare_jwt_secret.replace("\\n", "\n")

        # Ayrshare espera application/x-www-form-urlencoded, NO JSON
        form_data = {
            "domain":     settings.ayrshare_domain,
            "privateKey": private_key,
            "profileKey": profile_key,
            "expiresIn":  1800,  # 30 minutos para que el OAuth de LinkedIn/TikTok complete
        }

        # Content-Type para form-data (no usar _headers() que pone JSON)
        headers = {
            "Authorization": f"Bearer {settings.ayrshare_api_key}",
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{AYRSHARE_BASE}/profiles/generateJWT",
                headers=headers,
                data=form_data,  # form-urlencoded
            )
            resp.raise_for_status()
            result = resp.json()

        url = result.get("url") or result.get("jwtUrl") or result.get("link")
        if not url:
            logger.error("ayrshare_generate_jwt_no_url", response=result)
            raise ValueError(f"Ayrshare no devolvió una URL JWT: {result}")

        return url

    # ── Publicar ──────────────────────────────────────────────────────────────

    async def post(
        self,
        profile_key: str,
        text: str,
        platforms: list[str],
        media_urls: list[str] | None = None,
        scheduled_date: str | None = None,
    ) -> dict:
        """
        Publica contenido en una o varias redes sociales del cliente.

        platforms: ["instagram", "twitter", "facebook", "linkedin", "tiktok", ...]
        scheduled_date: ISO 8601 string para programar (opcional)
        """
        body: dict = {"post": text, "platforms": platforms}
        if media_urls:
            body["mediaUrls"] = media_urls
        if scheduled_date:
            body["scheduleDate"] = scheduled_date

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{AYRSHARE_BASE}/post",
                headers=_headers(profile_key),
                json=body,
            )
            resp.raise_for_status()
            return resp.json()

    # ── Redes conectadas ──────────────────────────────────────────────────────

    async def get_connected_platforms(self, profile_key: str) -> list[str]:
        """Devuelve la lista de redes sociales que el cliente tiene vinculadas."""
        try:
            profile = await self.get_profile(profile_key)
            logger.info("ayrshare_profile_raw", keys=list(profile.keys()), profile_key=profile_key[:8] + "...")

            # Ayrshare devuelve activeSocialAccounts (lista) cuando hay redes vinculadas.
            # Si no hay redes vinculadas el campo no aparece en la respuesta.
            active = profile.get("activeSocialAccounts")
            if isinstance(active, list) and active:
                return active

            # Fallback: extraer plataformas de displayNames (siempre presente)
            display_names = profile.get("displayNames", [])
            if isinstance(display_names, list) and display_names:
                platforms = list({entry["platform"] for entry in display_names if "platform" in entry})
                if platforms:
                    logger.info("ayrshare_platforms_from_displayNames", platforms=platforms)
                    return platforms

            # Fallback: claves del objeto socialAccounts si existe
            social_accounts = profile.get("socialAccounts")
            if isinstance(social_accounts, dict):
                return [k for k, v in social_accounts.items() if v]

            return []
        except Exception as e:
            logger.warning("ayrshare_get_platforms_failed", error=str(e))
            return []

    # ── Comentarios ───────────────────────────────────────────────────────────

    async def get_recent_comments(
        self, profile_key: str, platforms: list[str] | None = None, last_n: int = 50
    ) -> list[dict]:
        """
        Obtiene los comentarios recientes de una o varias plataformas.
        Usado por el job de polling como fallback al webhook.

        GET /api/comments?platforms=instagram,facebook&lastRecords=50
        """
        params: dict = {"lastRecords": last_n}
        if platforms:
            params["platforms"] = ",".join(platforms)

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{AYRSHARE_BASE}/comments",
                headers=_headers(profile_key),
                params=params,
            )
            if resp.status_code != 200:
                logger.warning("ayrshare_get_comments_failed", status=resp.status_code)
                return []
            data = resp.json()
            # Ayrshare devuelve { "comments": [...] } o directamente una lista
            if isinstance(data, list):
                return data
            return data.get("comments", [])

    async def reply_to_comment(
        self,
        profile_key: str,
        comment_id: str,
        platform: str,
        text: str,
    ) -> dict:
        """
        Publica una respuesta a un comentario en la plataforma indicada.

        POST /api/comments
        Body: { "id": "comment_id", "comment": "text", "platforms": ["platform"] }
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{AYRSHARE_BASE}/comments",
                headers=_headers(profile_key),
                json={
                    "id": comment_id,
                    "comment": text,
                    "platforms": [platform],
                },
            )
            if resp.status_code >= 400:
                logger.warning(
                    "ayrshare_reply_failed",
                    platform=platform,
                    status=resp.status_code,
                    body=resp.text[:200],
                )
                return {"ok": False, "error": resp.text}
            return {"ok": True, **resp.json()}

    # ── Registrar webhook ─────────────────────────────────────────────────────

    async def register_webhook(self, webhook_url: str) -> dict:
        """
        Registra la URL de webhook en Ayrshare para recibir notificaciones
        de comentarios, menciones y mensajes en tiempo real.

        POST /api/hook  { "action": "subscribe", "url": "https://..." }
        """
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{AYRSHARE_BASE}/hook",
                headers=_headers(),
                json={"action": "subscribe", "url": webhook_url},
            )
            resp.raise_for_status()
            return resp.json()


ayrshare_service = AyrshareService()
