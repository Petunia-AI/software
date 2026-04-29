"""
Tests de integración — Facebook Messenger (pages_messaging)

Cubre:
1. Verificación del webhook (GET /api/webhooks/messenger) — hub.challenge handshake
2. Rechazo de verify_token inválido
3. POST webhook con objeto distinto a "page" → ignorado (200 ok)
4. POST webhook con mensaje de echo → ignorado sin crear conversación
5. POST webhook mensaje real sin negocio configurado → ignorado sin error
6. POST webhook mensaje real con negocio configurado:
   - Crea Lead automáticamente
   - Crea Conversation con channel=messenger
   - Almacena el mensaje del usuario en la BD
7. Mensajes en conversación existente → se añaden al hilo (no crea duplicados)
8. Meta OAuth /meta/connect → 500 si no hay App ID configurado
9. Meta OAuth /meta/status → devuelve connected=False cuando no hay token
"""
import pytest
import uuid
import json
import hmac
import hashlib
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from unittest.mock import AsyncMock, patch

from app.models.business import Business
from app.models.conversation import Conversation, Channel
from app.models.lead import Lead
from app.config import settings


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _sign_payload(body: bytes, secret: str) -> str:
    """Genera la firma HMAC-SHA256 como la envía Meta."""
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def _messenger_payload(page_id: str, sender_psid: str, text: str, is_echo: bool = False) -> dict:
    """Construye un payload de webhook de Messenger."""
    return {
        "object": "page",
        "entry": [
            {
                "id": page_id,
                "messaging": [
                    {
                        "sender": {"id": sender_psid},
                        "recipient": {"id": page_id},
                        "message": {
                            "mid": f"mid.{uuid.uuid4().hex}",
                            "text": text,
                            **({"is_echo": True} if is_echo else {}),
                        },
                    }
                ],
            }
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# 1 & 2 — Verificación del webhook
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_messenger_webhook_verify_ok(client: AsyncClient):
    """Meta envía hub.challenge y debe recibir exactamente ese valor de vuelta."""
    verify_token = settings.instagram_verify_token  # token global configurado
    response = await client.get(
        "/api/webhooks/messenger",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": verify_token,
            "hub.challenge": "CHALLENGE_CODE_123",
        },
    )
    assert response.status_code == 200
    assert response.text == "CHALLENGE_CODE_123"


@pytest.mark.asyncio
async def test_messenger_webhook_verify_wrong_token(client: AsyncClient):
    """Verify token incorrecto → 403 Forbidden."""
    response = await client.get(
        "/api/webhooks/messenger",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "token_incorrecto",
            "hub.challenge": "CHALLENGE_CODE_123",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_messenger_webhook_verify_wrong_mode(client: AsyncClient):
    """hub.mode distinto a 'subscribe' → 403."""
    response = await client.get(
        "/api/webhooks/messenger",
        params={
            "hub.mode": "unsubscribe",
            "hub.verify_token": settings.instagram_verify_token,
            "hub.challenge": "XYZ",
        },
    )
    assert response.status_code == 403


# ─────────────────────────────────────────────────────────────────────────────
# 3 — Objeto distinto a "page" → ignorado
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_messenger_webhook_ignores_non_page_object(client: AsyncClient):
    """Payloads de tipo distinto a 'page' deben devolver 200 sin procesar nada."""
    payload = {"object": "instagram", "entry": []}
    response = await client.post("/api/webhooks/messenger", json=payload)
    assert response.status_code == 200
    assert response.json() == {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# 4 — Mensajes echo → ignorados
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_messenger_webhook_ignores_echo(client: AsyncClient, db: AsyncSession):
    """Los mensajes con is_echo=True son los enviados por la propia página; deben ignorarse."""
    page_id = f"page_{uuid.uuid4().hex[:8]}"
    payload = _messenger_payload(page_id, "USER_PSID_ECHO", "Hola", is_echo=True)
    response = await client.post("/api/webhooks/messenger", json=payload)
    assert response.status_code == 200

    # No debe existir ninguna conversación de Messenger con ese page_id
    result = await db.execute(
        select(Conversation).where(Conversation.channel == Channel.MESSENGER)
    )
    convs = result.scalars().all()
    echo_convs = [c for c in convs if c.channel_contact_id == "USER_PSID_ECHO"]
    assert len(echo_convs) == 0


# ─────────────────────────────────────────────────────────────────────────────
# 5 — Negocio no configurado → ignorado sin error 500
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_messenger_webhook_no_business_configured(client: AsyncClient):
    """Si no hay negocio con ese page_id, el webhook retorna 200 sin error."""
    payload = _messenger_payload("PAGE_ID_SIN_NEGOCIO", "PSID_SIN_NEGOCIO", "Hola")
    response = await client.post("/api/webhooks/messenger", json=payload)
    assert response.status_code == 200
    assert response.json() == {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# 6 — Mensaje real con negocio configurado → crea Lead + Conversation + Message
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_messenger_webhook_creates_lead_and_conversation(
    client: AsyncClient, db: AsyncSession
):
    """
    Simula el flujo completo:
    Meta envía un mensaje → se crea Lead, Conversation (channel=messenger)
    y el mensaje del usuario se persiste en la BD.
    La llamada al orquestador de IA y el envío via Graph API se mockean.
    """
    page_id      = f"fb_page_{uuid.uuid4().hex[:10]}"
    sender_psid  = f"psid_{uuid.uuid4().hex[:10]}"
    page_token   = "FAKE_PAGE_ACCESS_TOKEN"
    test_message = "Hola, quiero información sobre sus precios"

    # Crear un negocio con Messenger habilitado apuntando a esta page
    biz = Business(
        id=str(uuid.uuid4()),
        name="Messenger Test Biz",
        industry="Retail",
        product_description="Tienda online de ropa",
        pricing_info="$29.99 envío gratis",
        target_customer="Compradores online",
        value_proposition="Ropa de calidad a buen precio",
        instagram_page_id=page_id,       # Page ID de Facebook
        meta_page_token=page_token,
        messenger_enabled=True,
        is_active=True,
    )
    db.add(biz)
    await db.commit()
    await db.refresh(biz)

    payload = _messenger_payload(page_id, sender_psid, test_message)

    # Mockear el orquestador de IA y el envío via Messenger para aislar el test
    with (
        patch(
            "app.api.webhooks.orchestrator.process_message",
            new_callable=AsyncMock,
            return_value=("Claro, nuestros precios son muy competitivos.", "qualifier", None),
        ),
        patch(
            "app.api.webhooks.meta_social_service.send_messenger",
            new_callable=AsyncMock,
            return_value=True,
        ),
    ):
        response = await client.post("/api/webhooks/messenger", json=payload)

    assert response.status_code == 200, response.text
    assert response.json() == {"ok": True}

    # Verificar que se creó la conversación
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.business_id == biz.id,
            Conversation.channel == Channel.MESSENGER,
            Conversation.channel_contact_id == sender_psid,
        )
    )
    conv = conv_result.scalar_one_or_none()
    assert conv is not None, "Debe haberse creado una conversación de Messenger"

    # Verificar que se creó el Lead
    lead_result = await db.execute(
        select(Lead).where(Lead.id == conv.lead_id)
    )
    lead = lead_result.scalar_one_or_none()
    assert lead is not None
    assert lead.source == "messenger"

    # Verificar que el mensaje del usuario está en la BD
    from app.models.message import Message
    msg_result = await db.execute(
        select(Message).where(Message.conversation_id == conv.id)
    )
    messages = msg_result.scalars().all()
    user_msgs = [m for m in messages if m.content == test_message]
    assert len(user_msgs) >= 1, "El mensaje del usuario debe persistirse"


# ─────────────────────────────────────────────────────────────────────────────
# 7 — Segundo mensaje → reutiliza conversación existente
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_messenger_webhook_reuses_existing_conversation(
    client: AsyncClient, db: AsyncSession
):
    """
    Si el mismo sender_psid ya tiene una conversación activa,
    el segundo mensaje se añade al hilo existente (no crea uno nuevo).
    """
    page_id     = f"fb_page_{uuid.uuid4().hex[:10]}"
    sender_psid = f"psid_{uuid.uuid4().hex[:10]}"

    biz = Business(
        id=str(uuid.uuid4()),
        name="Messenger Reuse Biz",
        industry="SaaS",
        product_description="CRM para ventas",
        pricing_info="$99/mes",
        target_customer="Empresas",
        value_proposition="Automatiza tu CRM",
        instagram_page_id=page_id,
        meta_page_token="FAKE_TOKEN",
        messenger_enabled=True,
        is_active=True,
    )
    db.add(biz)
    await db.commit()

    mock_ai   = AsyncMock(return_value=("Respuesta IA", "qualifier", None))
    mock_send = AsyncMock(return_value=True)

    with (
        patch("app.api.webhooks.orchestrator.process_message", mock_ai),
        patch("app.api.webhooks.meta_social_service.send_messenger", mock_send),
    ):
        # Primer mensaje
        await client.post(
            "/api/webhooks/messenger",
            json=_messenger_payload(page_id, sender_psid, "Primer mensaje"),
        )
        # Segundo mensaje
        await client.post(
            "/api/webhooks/messenger",
            json=_messenger_payload(page_id, sender_psid, "Segundo mensaje"),
        )

    # Debe existir exactamente UNA conversación activa para ese PSID
    result = await db.execute(
        select(Conversation).where(
            Conversation.business_id == biz.id,
            Conversation.channel == Channel.MESSENGER,
            Conversation.channel_contact_id == sender_psid,
            Conversation.status == "active",
        )
    )
    convs = result.scalars().all()
    assert len(convs) == 1, f"Debe haber 1 conversación, encontradas: {len(convs)}"


# ─────────────────────────────────────────────────────────────────────────────
# 8 — Firma HMAC inválida → rechazada si app_secret está configurado
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_messenger_webhook_rejects_invalid_signature(client: AsyncClient):
    """Si app_secret está configurado, firmas incorrectas deben retornar 400."""
    original_secret = settings.instagram_app_secret
    try:
        settings.instagram_app_secret = "my_test_secret_123"
        payload = _messenger_payload("PAGE_X", "PSID_X", "Hola")
        body    = json.dumps(payload).encode()

        response = await client.post(
            "/api/webhooks/messenger",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": "sha256=firmaincorrecta",
            },
        )
        assert response.status_code == 400
    finally:
        settings.instagram_app_secret = original_secret


@pytest.mark.asyncio
async def test_messenger_webhook_accepts_valid_signature(client: AsyncClient):
    """Firma HMAC correcta → debe aceptarse (200)."""
    original_secret = settings.instagram_app_secret
    try:
        secret = "my_test_secret_456"
        settings.instagram_app_secret = secret

        payload = {"object": "page", "entry": []}
        body    = json.dumps(payload).encode()
        sig     = _sign_payload(body, secret)

        response = await client.post(
            "/api/webhooks/messenger",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": sig,
            },
        )
        assert response.status_code == 200
    finally:
        settings.instagram_app_secret = original_secret


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures locales con email único para tests OAuth (evitan colisión con test_user)
# ─────────────────────────────────────────────────────────────────────────────

import pytest_asyncio
from app.models.user import User
from app.core.security import get_password_hash


@pytest_asyncio.fixture
async def oauth_business(db: AsyncSession):
    biz = Business(
        id=str(uuid.uuid4()),
        name="OAuth Test Biz",
        industry="Tech",
        product_description="OAuth demo",
        pricing_info="Free",
        target_customer="Devs",
        value_proposition="Easy OAuth",
    )
    db.add(biz)
    await db.commit()
    await db.refresh(biz)
    return biz


@pytest_asyncio.fixture
async def oauth_user(db: AsyncSession, oauth_business: Business):
    user = User(
        id=str(uuid.uuid4()),
        email=f"oauth_{uuid.uuid4().hex[:8]}@test.com",
        hashed_password=get_password_hash("testpass123"),
        full_name="OAuth User",
        business_id=oauth_business.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def oauth_headers(client: AsyncClient, oauth_user: User):
    res = await client.post("/api/auth/login", json={
        "email": oauth_user.email,
        "password": "testpass123",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# 9 — Meta OAuth: /meta/connect sin App ID → 500
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_meta_connect_without_app_id_returns_500(
    client: AsyncClient, oauth_headers: dict
):
    """Si META_APP_ID no está configurado, /meta/connect debe retornar 500."""
    original_id     = settings.meta_app_id
    original_secret = settings.meta_app_secret
    try:
        settings.meta_app_id     = ""
        settings.meta_app_secret = ""
        response = await client.get("/api/meta/connect", headers=oauth_headers)
        assert response.status_code == 500
        assert "Meta App ID" in response.json().get("detail", "")
    finally:
        settings.meta_app_id     = original_id
        settings.meta_app_secret = original_secret


# ─────────────────────────────────────────────────────────────────────────────
# 10 — Meta OAuth: /meta/status → connected=False sin token
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_meta_status_not_connected(client: AsyncClient, oauth_headers: dict):
    """/meta/status debe indicar connected=False cuando el negocio no tiene token."""
    response = await client.get("/api/meta/status", headers=oauth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data.get("connected") is False
