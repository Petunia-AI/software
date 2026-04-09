"""
Rate limiting via slowapi (basado en limits).
Estrategia por clave:
  - Auth endpoints  → IP  (10 req/minuto)
  - API general     → JWT sub + IP (60 req/minuto)
  - Webhooks        → IP  (120 req/minuto — fuentes externas)
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse


def _key_func(request: Request) -> str:
    """Para rutas autenticadas usa el sub del token; si no, IP."""
    token_sub = getattr(request.state, "user_id", None)
    if token_sub:
        return f"user:{token_sub}"
    return get_remote_address(request)


# Instancia global — se usa como decorator en los routers
limiter = Limiter(key_func=_key_func, default_limits=["200/minute"])


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Respuesta uniforme cuando se supera el límite."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Demasiadas solicitudes. Intenta de nuevo en un momento.",
            "retry_after": str(exc.retry_after) if hasattr(exc, "retry_after") else "60",
        },
        headers={"Retry-After": "60"},
    )
