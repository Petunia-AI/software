"""
Media API — Subida, listado y eliminación de archivos de media para posts sociales.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import structlog

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.business import Business
from app.models.media_asset import MediaAsset
from app.models.subscription import Subscription, SubscriptionStatus, PLAN_LIMITS
from app.services.storage_service import save_media, delete_media

logger = structlog.get_logger()

router = APIRouter(prefix="/content/media", tags=["media"])

# ── Constantes ────────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES: dict[str, list[str]] = {
    "image": ["image/jpeg", "image/png", "image/gif", "image/webp"],
    "video": ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/mpeg"],
}
ALL_ALLOWED = {m for types in ALLOWED_MIME_TYPES.values() for m in types}

MAX_FILE_BYTES = 500 * 1024 * 1024   # 500 MB hard cap por archivo


# ── Schemas ───────────────────────────────────────────────────────────────────

class MediaAssetOut(BaseModel):
    id: str
    original_filename: str
    stored_filename: str
    mime_type: str
    file_type: str
    file_size_bytes: int
    public_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class StorageInfoOut(BaseModel):
    used_bytes: int
    limit_bytes: int
    used_mb: float
    limit_mb: float
    percentage: float
    plan: str
    asset_count: int


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_business(db: AsyncSession, user: User) -> Business:
    result = await db.execute(select(Business).where(Business.id == user.business_id))
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return biz


async def _get_plan_and_limit(db: AsyncSession, business_id: str) -> tuple[str, int]:
    """Devuelve (plan_name, storage_limit_bytes)."""
    result = await db.execute(
        select(Subscription).where(
            Subscription.business_id == business_id,
            Subscription.status.in_([SubscriptionStatus.active, SubscriptionStatus.trialing]),
        )
    )
    sub = result.scalar_one_or_none()
    plan = sub.plan if sub else "trial"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["trial"])
    limit_bytes = limits.get("media_storage_bytes", 500 * 1024 * 1024)
    return plan, limit_bytes


async def _used_bytes(db: AsyncSession, business_id: str) -> int:
    result = await db.execute(
        select(sqlfunc.coalesce(sqlfunc.sum(MediaAsset.file_size_bytes), 0))
        .where(MediaAsset.business_id == business_id)
    )
    return int(result.scalar() or 0)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/storage-info", response_model=StorageInfoOut)
async def get_storage_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    plan, limit_bytes = await _get_plan_and_limit(db, biz.id)
    used = await _used_bytes(db, biz.id)

    count_result = await db.execute(
        select(sqlfunc.count()).where(MediaAsset.business_id == biz.id)
    )
    count = int(count_result.scalar() or 0)

    return StorageInfoOut(
        used_bytes=used,
        limit_bytes=limit_bytes,
        used_mb=round(used / (1024 * 1024), 2),
        limit_mb=round(limit_bytes / (1024 * 1024), 0),
        percentage=round(min(100, used / limit_bytes * 100), 1) if limit_bytes > 0 else 0,
        plan=plan,
        asset_count=count,
    )


@router.get("", response_model=list[MediaAssetOut])
async def list_media(
    file_type: Optional[str] = Query(None, description="'image' o 'video'"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    q = select(MediaAsset).where(MediaAsset.business_id == biz.id)
    if file_type in ("image", "video"):
        q = q.where(MediaAsset.file_type == file_type)
    q = q.order_by(MediaAsset.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/upload", response_model=MediaAssetOut)
async def upload_media(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    plan, limit_bytes = await _get_plan_and_limit(db, biz.id)

    # ── Validar tipo MIME ──
    mime = file.content_type or ""
    if mime not in ALL_ALLOWED:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de archivo no permitido: {mime}. Usa imágenes (JPEG, PNG, GIF, WebP) o videos (MP4, MOV, WebM).",
        )
    file_type = "image" if mime in ALLOWED_MIME_TYPES["image"] else "video"

    # ── Leer archivo ──
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # ── Validar tamaño por archivo ──
    max_per_file = (25 if file_type == "image" else 500) * 1024 * 1024
    if file_size > max_per_file:
        limit_label = "25 MB" if file_type == "image" else "500 MB"
        raise HTTPException(
            status_code=413,
            detail=f"El archivo supera el límite de {limit_label} por archivo.",
        )

    # ── Validar cuota de almacenamiento ──
    used = await _used_bytes(db, biz.id)
    if used + file_size > limit_bytes:
        remaining_mb = round((limit_bytes - used) / (1024 * 1024), 1)
        raise HTTPException(
            status_code=413,
            detail=f"Sin espacio disponible. Tienes {remaining_mb} MB libres en tu plan {plan}. Elimina archivos o mejora tu plan.",
        )

    # ── Guardar archivo ──
    original_name = file.filename or "archivo"
    try:
        storage_path, public_url = await save_media(biz.id, original_name, file_bytes, mime)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    stored_filename = storage_path.rsplit("/", 1)[-1]

    # ── Persistir en BD ──
    asset = MediaAsset(
        business_id=biz.id,
        original_filename=original_name,
        stored_filename=stored_filename,
        mime_type=mime,
        file_type=file_type,
        file_size_bytes=file_size,
        storage_path=storage_path,
        public_url=public_url,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    logger.info(
        "media_uploaded",
        business_id=biz.id,
        file_type=file_type,
        size_mb=round(file_size / (1024 * 1024), 2),
        plan=plan,
        used_pct=round((used + file_size) / limit_bytes * 100, 1),
    )
    return asset


@router.delete("/{media_id}", status_code=204)
async def delete_media_asset(
    media_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biz = await _get_business(db, current_user)
    result = await db.execute(
        select(MediaAsset).where(
            MediaAsset.id == media_id,
            MediaAsset.business_id == biz.id,
        )
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    # Eliminar del almacenamiento
    try:
        await delete_media(asset.storage_path)
    except Exception as e:
        logger.warning("media_delete_storage_error", media_id=media_id, error=str(e))

    await db.delete(asset)
    await db.commit()
    logger.info("media_deleted", media_id=media_id, business_id=biz.id)
