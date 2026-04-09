from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.business import Business
from app.models.subscription import Subscription, SubscriptionStatus, PlanTier, PLAN_DISPLAY_NAMES
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from app.core.rate_limit import limiter
from app.schemas.auth import Token, LoginRequest, RegisterRequest, UserOut
from app.services import email_service
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    result = await db.execute(select(User).where(User.id == payload.get("sub")))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user


@router.post("/register", response_model=UserOut, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    # Crear negocio por defecto
    business = Business(name=f"Negocio de {data.full_name}")
    db.add(business)
    await db.flush()

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        business_id=business.id,
    )
    db.add(user)

    # Crear suscripción trial de 14 días automáticamente
    subscription = Subscription(
        business_id=business.id,
        plan=PlanTier.trial,
        status=SubscriptionStatus.trialing,
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db.add(subscription)

    await db.commit()
    await db.refresh(user)

    # Enviar email de bienvenida (fire-and-forget)
    import asyncio
    asyncio.create_task(
        email_service.send_welcome(
            to_email=user.email,
            name=user.full_name.split()[0],
            business_name=business.name,
        )
    )

    return user


@router.post("/token", response_model=Token)
@limiter.limit("10/minute")
async def login_form(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_access_token({"sub": user.id})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_access_token({"sub": user.id})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna el usuario autenticado con su plan activo."""
    from sqlalchemy import desc as _desc

    # Buscar suscripción activa
    sub_result = await db.execute(
        select(Subscription)
        .where(
            Subscription.business_id == current_user.business_id,
            Subscription.status.in_([SubscriptionStatus.active, SubscriptionStatus.trialing]),
        )
        .order_by(_desc(Subscription.created_at))
        .limit(1)
    )
    sub = sub_result.scalar_one_or_none()

    plan_tier = sub.plan.value if sub else "trial"
    plan_name = PLAN_DISPLAY_NAMES.get(plan_tier, plan_tier.capitalize())

    # Construir respuesta enriquecida
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "business_id": current_user.business_id,
        "plan_tier": plan_tier,
        "plan_name": plan_name,
    }

