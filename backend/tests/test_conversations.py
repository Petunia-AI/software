"""Tests de conversaciones — inicio, mensajes, takeover humano."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_start_conversation(client: AsyncClient, auth_headers):
    res = await client.post(
        "/api/conversations/start",
        params={"channel": "webchat", "lead_name": "Ana García"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    assert data["channel"] == "webchat"
    return data["id"]


@pytest.mark.asyncio
async def test_list_conversations(client: AsyncClient, auth_headers):
    # Crear una conversación primero
    await client.post(
        "/api/conversations/start",
        params={"channel": "webchat"},
        headers=auth_headers,
    )
    res = await client.get("/api/conversations/", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_get_conversation_by_id(client: AsyncClient, auth_headers):
    start = await client.post(
        "/api/conversations/start",
        params={"channel": "webchat"},
        headers=auth_headers,
    )
    conv_id = start.json()["id"]

    res = await client.get(f"/api/conversations/{conv_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == conv_id


@pytest.mark.asyncio
async def test_get_nonexistent_conversation_returns_404(client: AsyncClient, auth_headers):
    res = await client.get("/api/conversations/nonexistent-id", headers=auth_headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_human_takeover_disables_ai(client: AsyncClient, auth_headers):
    start = await client.post(
        "/api/conversations/start",
        params={"channel": "webchat"},
        headers=auth_headers,
    )
    conv_id = start.json()["id"]

    res = await client.post(
        f"/api/conversations/{conv_id}/takeover",
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_human_takeover"] is True


@pytest.mark.asyncio
async def test_filter_conversations_by_channel(client: AsyncClient, auth_headers):
    await client.post(
        "/api/conversations/start",
        params={"channel": "webchat"},
        headers=auth_headers,
    )
    res = await client.get(
        "/api/conversations/",
        params={"channel": "webchat"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    for conv in res.json():
        assert conv["channel"] == "webchat"
