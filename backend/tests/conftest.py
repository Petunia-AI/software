"""
Configuración compartida de pytest para tests de backend.
Usa una base de datos SQLite en memoria para tests rápidos.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.business import Business
from app.models.subscription import Subscription, SubscriptionStatus, PlanTier
from datetime import datetime, timezone, timedelta
import uuid

# ── Test DB (SQLite in-memory) ─────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db():
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db):
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Fixtures de datos ──────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def test_business(db: AsyncSession):
    biz = Business(
        id=str(uuid.uuid4()),
        name="Test Business",
        industry="SaaS",
        product_description="Software de ventas IA",
        pricing_info="$99/mes",
        target_customer="Empresas B2B",
        value_proposition="Automatiza tus ventas",
    )
    db.add(biz)
    await db.commit()
    await db.refresh(biz)
    return biz


@pytest_asyncio.fixture
async def test_subscription(db: AsyncSession, test_business: Business):
    sub = Subscription(
        business_id=test_business.id,
        plan=PlanTier.pro,
        status=SubscriptionStatus.active,
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


@pytest_asyncio.fixture
async def test_user(db: AsyncSession, test_business: Business):
    user = User(
        id=str(uuid.uuid4()),
        email="test@empresa.com",
        hashed_password=get_password_hash("testpass123"),
        full_name="Test User",
        business_id=test_business.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, test_user: User):
    """Devuelve headers con JWT para requests autenticados."""
    res = await client.post("/api/auth/login", json={
        "email": "test@empresa.com",
        "password": "testpass123",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
