"""
TikTok API Service — publicación de videos y gestión de comentarios.

Capacidades:
- Publicar videos (subida directa o por URL pública)
- Listar comentarios de un video
- Responder comentarios
- Obtener info básica del usuario

Nota sobre DMs: La TikTok Direct Message API solo está disponible para
cuentas de TikTok for Business con aprobación especial. Los agentes trabajan
sobre comentarios de videos como canal de conversación.

Docs: https://developers.tiktok.com/doc/
"""
import httpx
import structlog

logger = structlog.get_logger()

TIKTOK_API = "https://open.tiktokapis.com/v2"


class TikTokService:

    # ── Auth ──────────────────────────────────────────────────────────────────

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
        client_key: str,
        client_secret: str,
        code_verifier: str | None = None,
    ) -> dict:
        """Intercambia código OAuth por access_token + refresh_token."""
        payload: dict = {
            "client_key": client_key,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }
        if code_verifier:
            payload["code_verifier"] = code_verifier

        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://open.tiktokapis.com/v2/oauth/token/",
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            r.raise_for_status()
            return r.json()

    async def refresh_token(
        self,
        refresh_token: str,
        client_key: str,
        client_secret: str,
    ) -> dict:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://open.tiktokapis.com/v2/oauth/token/",
                data={
                    "client_key": client_key,
                    "client_secret": client_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            r.raise_for_status()
            return r.json()

    def _headers(self, access_token: str) -> dict:
        return {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    # ── Perfil ────────────────────────────────────────────────────────────────

    async def get_user_info(self, access_token: str) -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{TIKTOK_API}/user/info/",
                json={"fields": ["open_id", "display_name", "avatar_url", "profile_deep_link"]},
                headers=self._headers(access_token),
            )
            if r.status_code == 200:
                return r.json().get("data", {}).get("user", {})
            return {}

    # ── Publicación de videos ─────────────────────────────────────────────────

    async def publish_video_from_url(
        self,
        access_token: str,
        video_url: str,
        title: str = "",
        privacy: str = "PUBLIC_TO_EVERYONE",
    ) -> dict:
        """
        Publica un video en TikTok desde una URL pública.
        privacy: PUBLIC_TO_EVERYONE | MUTUAL_FOLLOW_FRIENDS | FOLLOWER_OF_CREATOR | SELF_ONLY
        """
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{TIKTOK_API}/post/publish/video/init/",
                json={
                    "post_info": {
                        "title": title[:2200] if title else "",
                        "privacy_level": privacy,
                        "disable_duet": False,
                        "disable_comment": False,
                        "disable_stitch": False,
                    },
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "video_url": video_url,
                    },
                },
                headers=self._headers(access_token),
            )
            if r.status_code == 200:
                data = r.json().get("data", {})
                logger.info("tiktok_video_published", publish_id=data.get("publish_id"))
                return {"ok": True, "publish_id": data.get("publish_id", "")}
            logger.error("tiktok_publish_error", status=r.status_code, body=r.text)
            return {"ok": False, "error": r.text}

    async def get_publish_status(self, access_token: str, publish_id: str) -> dict:
        """Consulta el estado de publicación de un video."""
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{TIKTOK_API}/post/publish/status/fetch/",
                json={"publish_id": publish_id},
                headers=self._headers(access_token),
            )
            if r.status_code == 200:
                return r.json().get("data", {})
            return {}

    async def list_videos(self, access_token: str, max_count: int = 20) -> list[dict]:
        """Lista los videos del usuario autenticado."""
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{TIKTOK_API}/video/list/",
                json={
                    "fields": ["id", "title", "create_time", "share_url", "comment_count", "like_count"],
                    "max_count": max_count,
                },
                headers=self._headers(access_token),
            )
            if r.status_code == 200:
                return r.json().get("data", {}).get("videos", [])
            return []

    # ── Comentarios ───────────────────────────────────────────────────────────

    async def list_comments(
        self,
        access_token: str,
        video_id: str,
        max_count: int = 50,
    ) -> list[dict]:
        """Lista comentarios de un video TikTok."""
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{TIKTOK_API}/research/video/comment/list/",
                json={
                    "video_id": video_id,
                    "fields": ["id", "video_id", "text", "create_time", "like_count", "reply_count", "parent_comment_id"],
                    "max_count": max_count,
                    "cursor": 0,
                },
                headers=self._headers(access_token),
            )
            if r.status_code == 200:
                return r.json().get("data", {}).get("comments", [])
            return []

    async def reply_to_comment(
        self,
        access_token: str,
        video_id: str,
        comment_id: str,
        text: str,
    ) -> bool:
        """Responde a un comentario de un video TikTok."""
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{TIKTOK_API}/comment/reply/",
                json={
                    "video_id": video_id,
                    "comment_id": comment_id,
                    "text": text[:150],   # TikTok limite de 150 caracteres por comentario
                },
                headers=self._headers(access_token),
            )
            ok = r.status_code == 200
            if not ok:
                logger.error("tiktok_reply_error", status=r.status_code, body=r.text)
            return ok

    async def post_comment(
        self,
        access_token: str,
        video_id: str,
        text: str,
    ) -> bool:
        """Publica un comentario nuevo en un video TikTok."""
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{TIKTOK_API}/comment/create/",
                json={
                    "video_id": video_id,
                    "text": text[:150],
                },
                headers=self._headers(access_token),
            )
            return r.status_code == 200


tiktok_service = TikTokService()
