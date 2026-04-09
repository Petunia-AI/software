"""Tests de autenticación — registro, login, /me."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_creates_user_and_subscription(client: AsyncClient):
    """Al registrarse se crea usuario + negocio + suscripción trial."""
    res = await client.post("/api/auth/register", json={
        "email": "nuevo@empresa.com",
        "password": "segura123",
        "full_name": "Nuevo Usuario",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "nuevo@empresa.com"
    assert "id" in data
    assert "business_id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email_fails(client: AsyncClient):
    email = "dup@empresa.com"
    await client.post("/api/auth/register", json={
        "email": email, "password": "pass123", "full_name": "A"
    })
    res = await client.post("/api/auth/register", json={
        "email": email, "password": "pass123", "full_name": "B"
    })
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_login_returns_token(client: AsyncClient, test_user):
    res = await client.post("/api/auth/login", json={
        "email": "test@empresa.com",
        "password": "testpass123",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password_fails(client: AsyncClient, test_user):
    res = await client.post("/api/auth/login", json={
        "email": "test@empresa.com",
        "password": "wrong",
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_current_user(client: AsyncClient, test_user, auth_headers):
    res = await client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "test@empresa.com"
    assert data["full_name"] == "Test User"


@pytest.mark.asyncio
async def test_me_without_token_fails(client: AsyncClient):
    res = await client.get("/api/auth/me")
    assert res.status_code == 401
