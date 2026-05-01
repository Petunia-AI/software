"""
Social Publisher Service — Publica contenido en Instagram, Facebook, LinkedIn y X (Twitter).
Todas las funciones son fire-and-forget: si falta la credencial, retornan False silenciosamente.
"""
import httpx
import structlog
from app.config import settings

logger = structlog.get_logger()


# ── Instagram / Facebook (Meta Graph API) ─────────────────────────────────────

async def publish_instagram(caption: str, image_url: str | None = None) -> dict:
    """
    Publica en Instagram Business.
    Requiere: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID en settings.
    Si no hay imagen, publica como Reels texto (requiere video) — se salta.
    Con imagen: crea container y publica.
    """
    if not settings.instagram_access_token or not settings.instagram_account_id:
        logger.warning("instagram_publish_skip", reason="no credentials")
        return {"success": False, "error": "Instagram no configurado"}

    account_id = settings.instagram_account_id
    token = settings.instagram_access_token
    base = f"https://graph.facebook.com/v18.0/{account_id}"

    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Crear media container
        container_payload: dict = {"caption": caption, "access_token": token}
        if image_url:
            container_payload["image_url"] = image_url
        else:
            # Sin imagen publicamos como history / text (carrusel de 1 slide de color)
            container_payload["media_type"] = "REELS"
            logger.warning("instagram_no_image", note="texto sin imagen no soportado en IG, se requiere imagen")
            return {"success": False, "error": "Instagram requiere imagen o video"}

        r = await client.post(f"{base}/media", json=container_payload)
        if r.status_code != 200:
            logger.error("instagram_container_error", status=r.status_code, body=r.text)
            return {"success": False, "error": r.text}

        container_id = r.json().get("id")

        # 2. Publicar container
        pub = await client.post(
            f"{base}/media_publish",
            json={"creation_id": container_id, "access_token": token},
        )
        if pub.status_code != 200:
            logger.error("instagram_publish_error", status=pub.status_code, body=pub.text)
            return {"success": False, "error": pub.text}

        post_id = pub.json().get("id")
        logger.info("instagram_published", post_id=post_id)
        return {"success": True, "platform_post_id": post_id, "platform_url": f"https://www.instagram.com/p/{post_id}/"}


async def publish_facebook(caption: str, image_url: str | None = None) -> dict:
    """
    Publica en una Página de Facebook.
    Requiere: FACEBOOK_PAGE_ID, FACEBOOK_PAGE_TOKEN en settings.
    """
    if not settings.facebook_page_id or not settings.facebook_page_token:
        logger.warning("facebook_publish_skip", reason="no credentials")
        return {"success": False, "error": "Facebook no configurado"}

    page_id = settings.facebook_page_id
    token = settings.facebook_page_token

    async with httpx.AsyncClient(timeout=30) as client:
        if image_url:
            endpoint = f"https://graph.facebook.com/v18.0/{page_id}/photos"
            payload = {"caption": caption, "url": image_url, "access_token": token}
        else:
            endpoint = f"https://graph.facebook.com/v18.0/{page_id}/feed"
            payload = {"message": caption, "access_token": token}

        r = await client.post(endpoint, json=payload)
        if r.status_code != 200:
            logger.error("facebook_publish_error", status=r.status_code, body=r.text)
            return {"success": False, "error": r.text}

        data = r.json()
        post_id = data.get("post_id") or data.get("id")
        logger.info("facebook_published", post_id=post_id)
        return {"success": True, "platform_post_id": str(post_id), "platform_url": f"https://facebook.com/{post_id}"}


# ── LinkedIn ──────────────────────────────────────────────────────────────────

async def publish_linkedin(caption: str, image_url: str | None = None) -> dict:
    """
    Publica en LinkedIn (perfil de empresa o personal).
    Requiere: LINKEDIN_ACCESS_TOKEN, LINKEDIN_AUTHOR_URN en settings.
    Ej: LINKEDIN_AUTHOR_URN=urn:li:organization:12345678
    """
    if not settings.linkedin_access_token or not settings.linkedin_author_urn:
        logger.warning("linkedin_publish_skip", reason="no credentials")
        return {"success": False, "error": "LinkedIn no configurado"}

    headers = {
        "Authorization": f"Bearer {settings.linkedin_access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }

    payload: dict = {
        "author": settings.linkedin_author_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": caption},
                "shareMediaCategory": "NONE" if not image_url else "IMAGE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post("https://api.linkedin.com/v2/ugcPosts", headers=headers, json=payload)
        if r.status_code not in (200, 201):
            logger.error("linkedin_publish_error", status=r.status_code, body=r.text)
            return {"success": False, "error": r.text}

        post_id = r.headers.get("x-restli-id") or r.json().get("id", "")
        logger.info("linkedin_published", post_id=post_id)
        return {"success": True, "platform_post_id": str(post_id), "platform_url": f"https://www.linkedin.com/feed/update/{post_id}/"}


# ── X / Twitter ───────────────────────────────────────────────────────────────

async def publish_twitter(caption: str) -> dict:
    """
    Publica un tweet en X (Twitter API v2).
    Requiere: TWITTER_BEARER_TOKEN, TWITTER_API_KEY, TWITTER_API_SECRET,
              TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET en settings.
    """
    if not settings.twitter_api_key or not settings.twitter_access_token:
        logger.warning("twitter_publish_skip", reason="no credentials")
        return {"success": False, "error": "X (Twitter) no configurado"}

    # OAuth 1.0a para Twitter API v2
    from requests_oauthlib import OAuth1
    import httpx

    auth = OAuth1(
        settings.twitter_api_key,
        settings.twitter_api_secret,
        settings.twitter_access_token,
        settings.twitter_access_secret,
    )

    # Truncar a 280 chars
    text = caption[:280]

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            "https://api.twitter.com/2/tweets",
            json={"text": text},
            headers={"Content-Type": "application/json"},
            auth=auth,  # type: ignore
        )
        if r.status_code not in (200, 201):
            logger.error("twitter_publish_error", status=r.status_code, body=r.text)
            return {"success": False, "error": r.text}

        data = r.json().get("data", {})
        tweet_id = data.get("id")
        logger.info("twitter_published", tweet_id=tweet_id)
        return {"success": True, "platform_post_id": tweet_id, "platform_url": f"https://x.com/i/web/status/{tweet_id}"}


# ── Zernio publisher (multi-plataforma unificado) ─────────────────────────────

async def publish_via_zernio(
    profile_id: str,
    caption: str,
    platform_accounts: list[dict],
    image_url: str | None = None,
    scheduled_date: str | None = None,
    format_type: str = "post",
) -> dict:
    """
    Publica en una o varias redes usando Zernio.
    Requiere que el negocio tenga zernio_profile_id configurado.

    platform_accounts: [{"platform": "instagram", "accountId": "acc_xxx"}, ...]
    """
    from app.services.zernio_service import zernio_service

    # Para Instagram, añadir contentType cuando es story o reel
    resolved_accounts = []
    for acc in platform_accounts:
        if acc.get("platform") == "instagram" and format_type in ("story", "reel"):
            content_type_map = {"story": "story", "reel": "reels"}
            acc = dict(acc)
            acc["platformSpecificData"] = {"contentType": content_type_map[format_type]}
        resolved_accounts.append(acc)

    try:
        result = await zernio_service.post(
            profile_id=profile_id,
            text=caption,
            platform_accounts=resolved_accounts,
            media_urls=[image_url] if image_url else None,
            scheduled_date=scheduled_date,
            publish_now=(scheduled_date is None),
        )
        if result.get("skipped"):
            return {"success": False, "error": result.get("reason", "Plataforma requiere imagen o video")}
        post_id = result.get("_id") or result.get("id", "")
        logger.info("zernio_published", platforms=[a["platform"] for a in platform_accounts], post_id=post_id)
        return {"success": True, "platform_post_id": str(post_id), "platform_url": "", "zernio": result}
    except Exception as e:
        logger.error("zernio_publish_error", error=str(e))
        return {"success": False, "error": str(e)}


# ── Dispatcher principal ──────────────────────────────────────────────────────

async def publish_post(
    channel: str,
    caption: str,
    image_url: str | None = None,
    zernio_profile_id: str | None = None,
    zernio_connected_platforms: list[dict] | None = None,
    format_type: str = "post",
) -> dict:
    """
    Dispatcher que enruta al publisher correcto.
    Si el negocio tiene Zernio conectado y la plataforma está vinculada,
    se publica a través de Zernio. Los canales exclusivos de Meta
    (WhatsApp, Messenger) siguen usando API directa.

    zernio_connected_platforms: [{"platform": "instagram", "accountId": "acc_xxx"}, ...]
    """
    # Normalizar formato legacy (lista de strings → lista de dicts)
    if zernio_connected_platforms:
        zernio_connected_platforms = [
            a if isinstance(a, dict) else {"platform": a, "accountId": ""}
            for a in zernio_connected_platforms
        ]

    # Buscar accountId para el canal en las cuentas conectadas de Zernio
    if zernio_profile_id and zernio_connected_platforms:
        match = next(
            (a for a in zernio_connected_platforms if a.get("platform") == channel),
            None,
        )
        if match:
            return await publish_via_zernio(
                profile_id=zernio_profile_id,
                caption=caption,
                platform_accounts=[{"platform": match["platform"], "accountId": match["accountId"]}],
                image_url=image_url,
                format_type=format_type,
            )

    # Fallback a APIs directas
    handlers = {
        "instagram": lambda: publish_instagram(caption, image_url),
        "facebook":  lambda: publish_facebook(caption, image_url),
        "linkedin":  lambda: publish_linkedin(caption, image_url),
        "twitter":   lambda: publish_twitter(caption),
    }
    handler = handlers.get(channel)
    if not handler:
        return {"success": False, "error": f"Canal desconocido: {channel}"}
    return await handler()
