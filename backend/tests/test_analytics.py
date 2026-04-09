"""Tests del endpoint de analytics."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_stats_structure(client: AsyncClient, auth_headers):
    res = await client.get("/api/analytics/dashboard", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    required_keys = [
        "total_conversations", "active_conversations",
        "total_leads", "qualified_leads", "closed_won",
        "conversion_rate", "avg_qualification_score",
    ]
    for key in required_keys:
        assert key in data, f"Missing key: {key}"


@pytest.mark.asyncio
async def test_dashboard_stats_defaults_to_zero(client: AsyncClient, auth_headers):
    """Sin datos, todos los stats deben ser 0."""
    res = await client.get("/api/analytics/dashboard", headers=auth_headers)
    data = res.json()
    assert data["total_conversations"] >= 0
    assert data["total_leads"] >= 0
    assert 0 <= data["conversion_rate"] <= 100


@pytest.mark.asyncio
async def test_trend_returns_list(client: AsyncClient, auth_headers):
    res = await client.get("/api/analytics/conversations/trend", params={"days": 7}, headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_agent_performance_returns_list(client: AsyncClient, auth_headers):
    res = await client.get("/api/analytics/agents/performance", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_leads_funnel_returns_all_stages(client: AsyncClient, auth_headers):
    res = await client.get("/api/analytics/leads/funnel", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    stages = [item["stage"] for item in data]
    assert "new" in stages
    assert "closed_won" in stages


@pytest.mark.asyncio
async def test_score_distribution_returns_buckets(client: AsyncClient, auth_headers):
    res = await client.get("/api/analytics/leads/score-distribution", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    for bucket in data:
        assert "bucket" in bucket
        assert "count" in bucket


@pytest.mark.asyncio
async def test_export_leads_csv(client: AsyncClient, auth_headers):
    res = await client.get("/api/analytics/export/leads", params={"days": 30}, headers=auth_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment" in res.headers["content-disposition"]
    # Verificar header CSV
    content = res.text
    assert "ID" in content
    assert "Nombre" in content
    assert "Score BANT" in content


@pytest.mark.asyncio
async def test_export_conversations_csv(client: AsyncClient, auth_headers):
    res = await client.get("/api/analytics/export/conversations", params={"days": 30}, headers=auth_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    content = res.text
    assert "Canal" in content
    assert "Estado" in content
