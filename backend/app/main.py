from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.api import auth, conversations, leads, analytics, webhooks, business, admin, billing, content
from app.api import properties as properties_router
from app.api import meta_oauth
from app.core.scheduler import start_scheduler, stop_scheduler
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
import structlog
import os

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", env=settings.app_env)
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("shutdown")


app = FastAPI(
    title="Agente de Ventas AI",
    description="Plataforma de IA conversacional para automatizar ventas en LATAM",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,   # deshabilitar Swagger en producción
    redoc_url="/redoc" if settings.debug else None,
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ── CORS — estricto en producción ────────────────────────────────────────────
_allowed_origins = (
    ["*"]
    if settings.debug
    else [
        settings.frontend_url,
        f"https://www.{settings.frontend_url.removeprefix('https://')}",
    ]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(webhooks.router, prefix="/api")
app.include_router(business.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(content.router, prefix="/api")
app.include_router(properties_router.router, prefix="/api")
app.include_router(meta_oauth.router, prefix="/api")

# Servir imágenes subidas como archivos estáticos
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "model": settings.claude_model}
