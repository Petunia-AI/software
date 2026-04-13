"""
LinkedIn API Service — publicación de contenido y gestión de comentarios.

Capacidades:
- Publicar texto + imagen en perfil personal o página de organización
- Listar comentarios de un post
- Responder comentarios (reply)
- Obtener perfil básico del usuario

Nota sobre DMs: LinkedIn no expone la API de mensajes directos al público general.
Solo está disponible para Marketing Partners certificados. Los agentes trabajan
sobre comentarios de posts como canal de conversación.

Docs: https://learn.microsoft.com/en-us/linkedin/marketing/
"""
import httpx
import structlog
from datetime import datetime, timezone, timedelta

logger = structlog.get_logger()

LINKEDIN_API = "https://api.linkedin.com/v2"
LINKEDIN_REST = "https://api.linkedin.com/rest"


class LinkedInService:

    # ── Auth ──────────────────────────────────────────────────────────────────

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
        client_id: str,
        client_secret: str,
    ) -> dict:
        """Intercambia código OAuth por access_token + refresh_token."""
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            r.raise_for_status()
            return r.json()

    async def refresh_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str,
    ) -> dict:
        """Renueva el access_token usando el refresh_token."""
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            r.raise_for_status()
            return r.json()

    # ── Perfil ────────────────────────────────────────────────────────────────

    async def get_profile(self, access_token: str) -> dict:
        """Obtiene id y nombre del usuario autenticado."""
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{LINKEDIN_API}/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            return r.json() if r.status_code == 200 else {}

    async def get_organizations(self, access_token: str) -> list[dict]:
        """Lista las organizaciones/páginas que administra el usuario."""
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{LINKEDIN_API}/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(id,localizedName,vanityName)))",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "LinkedIn-Version": "202304",
                },
            )
            if r.status_code != 200:
                return []
            data = r.json().get("elements", [])
            return [
                {
                    "id": e.get("organizationalTarget", "").replace("urn:li:organization:", ""),
                    "urn": e.get("organizationalTarget", ""),
                    "name": e.get("organizationalTarget~", {}).get("localizedName", ""),
                }
                for e in data
                if e.get("organizationalTarget")
            ]

    # ── Publicación ───────────────────────────────────────────────────────────

    async def create_post(
        self,
        access_token: str,
        author_urn: str,
        text: str,
        image_url: str | None = None,
    ) -> dict:
        """
        Publica un post de texto (+ imagen opcional) en LinkedIn.

        author_urn: 'urn:li:person:xxx' para personal, 'urn:li:organization:xxx' para página.
        """
        share_content: dict = {
            "shareCommentary": {"text": text},
            "shareMediaCategory": "NONE",
        }

        if image_url:
            # 1. Registrar el asset de imagen
            asset = await self._register_image_upload(access_token, author_urn)
            if asset:
                upload_ok = await self._upload_image(
                    access_token,
                    asset["uploadUrl"],
                    image_url,
                )
                if upload_ok:
                    share_content["shareMediaCategory"] = "IMAGE"
                    share_content["media"] = [
                        {
                            "status": "READY",
                            "description": {"text": ""},
                            "media": asset["asset"],
                            "title": {"text": ""},
                        }
                    ]

        payload = {
            "author": author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": share_content,
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
        }

        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{LINKEDIN_API}/ugcPosts",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
            if r.status_code in (200, 201):
                post_id = r.headers.get("x-restli-id", "") or r.json().get("id", "")
                logger.info("linkedin_post_created", post_id=post_id)
                return {"ok": True, "post_id": post_id}
            logger.error("linkedin_post_error", status=r.status_code, body=r.text)
            return {"ok": False, "error": r.text}

    async def _register_image_upload(self, access_token: str, author_urn: str) -> dict | None:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{LINKEDIN_API}/assets?action=registerUpload",
                json={
                    "registerUploadRequest": {
                        "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                        "owner": author_urn,
                        "serviceRelationships": [
                            {
                                "relationshipType": "OWNER",
                                "identifier": "urn:li:userGeneratedContent",
                            }
                        ],
                    }
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            if r.status_code != 200:
                return None
            data = r.json()
            upload_mech = data.get("value", {}).get("uploadMechanism", {})
            upload_url = (
                upload_mech
                .get("com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest", {})
                .get("uploadUrl", "")
            )
            asset = data.get("value", {}).get("asset", "")
            return {"uploadUrl": upload_url, "asset": asset} if upload_url else None

    async def _upload_image(self, access_token: str, upload_url: str, image_url: str) -> bool:
        """Descarga la imagen desde image_url y la sube a LinkedIn."""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                img_r = await client.get(image_url)
                if img_r.status_code != 200:
                    return False
                up_r = await client.put(
                    upload_url,
                    content=img_r.content,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": img_r.headers.get("Content-Type", "image/jpeg"),
                    },
                )
                return up_r.status_code in (200, 201)
        except Exception as e:
            logger.error("linkedin_image_upload_error", error=str(e))
            return False

    # ── Comentarios ───────────────────────────────────────────────────────────

    async def get_post_comments(
        self,
        access_token: str,
        post_urn: str,
        count: int = 50,
    ) -> list[dict]:
        """
        Lista comentarios de un post (UGC post).
        post_urn: 'urn:li:ugcPost:xxx' o 'urn:li:share:xxx'
        """
        import urllib.parse
        encoded = urllib.parse.quote(post_urn, safe="")
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{LINKEDIN_API}/socialActions/{encoded}/comments?count={count}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
            if r.status_code != 200:
                return []
            return r.json().get("elements", [])

    async def reply_to_comment(
        self,
        access_token: str,
        post_urn: str,
        parent_comment_urn: str,
        author_urn: str,
        text: str,
    ) -> bool:
        """Responde a un comentario en LinkedIn."""
        import urllib.parse
        encoded_post = urllib.parse.quote(post_urn, safe="")
        encoded_comment = urllib.parse.quote(parent_comment_urn, safe="")
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{LINKEDIN_API}/socialActions/{encoded_post}/comments/{encoded_comment}/comments",
                json={
                    "actor": author_urn,
                    "message": {"text": text},
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
            return r.status_code in (200, 201)

    async def post_comment(
        self,
        access_token: str,
        post_urn: str,
        author_urn: str,
        text: str,
    ) -> bool:
        """Publica un comentario nuevo en un post."""
        import urllib.parse
        encoded = urllib.parse.quote(post_urn, safe="")
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{LINKEDIN_API}/socialActions/{encoded}/comments",
                json={
                    "actor": author_urn,
                    "message": {"text": text},
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
            )
            return r.status_code in (200, 201)


linkedin_service = LinkedInService()
