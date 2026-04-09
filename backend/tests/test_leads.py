"""Tests de CRUD de leads y calificación BANT."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_lead(client: AsyncClient, auth_headers):
    res = await client.post("/api/leads/", json={
        "name": "Carlos López",
        "email": "carlos@empresa.mx",
        "phone": "+5215512345678",
        "source": "webchat",
    }, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Carlos López"
    assert data["stage"] == "new"
    return data["id"]


@pytest.mark.asyncio
async def test_list_leads_returns_created(client: AsyncClient, auth_headers):
    # Crear primero
    await client.post("/api/leads/", json={
        "name": "List Test", "email": "list@test.com",
    }, headers=auth_headers)

    res = await client.get("/api/leads/", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert any(l["name"] == "List Test" for l in data)


@pytest.mark.asyncio
async def test_update_lead_score(client: AsyncClient, auth_headers):
    create_res = await client.post("/api/leads/", json={
        "name": "Score Test", "email": "score@test.com",
    }, headers=auth_headers)
    lead_id = create_res.json()["id"]

    res = await client.patch(f"/api/leads/{lead_id}", json={
        "qualification_score": 8,
        "budget": "500k-1M USD",
        "authority": "Tomador de decisiones",
        "need": "Automatizar ventas",
        "timeline": "Q1 2025",
    }, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["qualification_score"] == 8
    assert data["budget"] == "500k-1M USD"


@pytest.mark.asyncio
async def test_filter_leads_by_stage(client: AsyncClient, auth_headers):
    res = await client.get("/api/leads/", params={"stage": "new"}, headers=auth_headers)
    assert res.status_code == 200
    for lead in res.json():
        assert lead["stage"] == "new"


@pytest.mark.asyncio
async def test_filter_leads_by_min_score(client: AsyncClient, auth_headers):
    # Crear lead con score alto
    create = await client.post("/api/leads/", json={"name": "High Score"}, headers=auth_headers)
    lid = create.json()["id"]
    await client.patch(f"/api/leads/{lid}", json={"qualification_score": 9}, headers=auth_headers)

    res = await client.get("/api/leads/", params={"min_score": 7}, headers=auth_headers)
    assert res.status_code == 200
    for lead in res.json():
        assert (lead["qualification_score"] or 0) >= 7


@pytest.mark.asyncio
async def test_delete_lead(client: AsyncClient, auth_headers):
    create = await client.post("/api/leads/", json={"name": "To Delete"}, headers=auth_headers)
    lid = create.json()["id"]

    res = await client.delete(f"/api/leads/{lid}", headers=auth_headers)
    assert res.status_code == 204

    get_res = await client.get(f"/api/leads/{lid}", headers=auth_headers)
    assert get_res.status_code == 404
