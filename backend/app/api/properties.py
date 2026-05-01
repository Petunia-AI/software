"""
Properties API — Gestión de propiedades inmobiliarias por negocio.
Incluye ficha técnica, galería de imágenes y stock para contenido.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
import uuid
import mimetypes

from app.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.property import Property, PropertyImage, PropertyType, OperationType, PropertyStatus
from app.services.storage_service import save_media, delete_media

router = APIRouter(prefix="/properties", tags=["properties"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_MB = 10


# ── Schemas ───────────────────────────────────────────────────────────────────

class PropertyCreate(BaseModel):
    title:           str
    property_type:   str
    operation_type:  str = "venta"
    status:          str = "disponible"
    description:     Optional[str] = None
    address:         Optional[str] = None
    neighborhood:    Optional[str] = None
    city:            Optional[str] = None
    state:           Optional[str] = None
    price:           Optional[float] = None
    currency:        str = "USD"
    # Ficha técnica
    bedrooms:        Optional[int]   = None
    bathrooms:       Optional[float] = None
    parking_spaces:  Optional[int]   = None
    area_m2:         Optional[float] = None
    construction_m2: Optional[float] = None
    floor:           Optional[int]   = None
    total_floors:    Optional[int]   = None
    age_years:       Optional[int]   = None
    amenities:       list[str]       = []
    features:        dict            = {}


class PropertyUpdate(PropertyCreate):
    title: Optional[str] = None
    property_type: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(prop: Property) -> dict:
    return {
        "id":              prop.id,
        "title":           prop.title,
        "property_type":   prop.property_type.value if prop.property_type else None,
        "operation_type":  prop.operation_type.value if prop.operation_type else None,
        "status":          prop.status.value if prop.status else None,
        "description":     prop.description,
        "address":         prop.address,
        "neighborhood":    prop.neighborhood,
        "city":            prop.city,
        "state":           prop.state,
        "price":           prop.price,
        "currency":        prop.currency or "USD",
        "bedrooms":        prop.bedrooms,
        "bathrooms":       prop.bathrooms,
        "parking_spaces":  prop.parking_spaces,
        "area_m2":         prop.area_m2,
        "construction_m2": prop.construction_m2,
        "floor":           prop.floor,
        "total_floors":    prop.total_floors,
        "age_years":       prop.age_years,
        "amenities":       prop.amenities or [],
        "features":        prop.features or {},
        "cover_image_url": prop.cover_image_url,
        "images": [
            {
                "id":       img.id,
                "url":      img.url,
                "caption":  img.caption,
                "is_cover": img.is_cover,
                "order":    img.order,
            }
            for img in (prop.images or [])
        ],
        "is_active":  prop.is_active,
        "created_at": prop.created_at.isoformat() if prop.created_at else None,
    }


async def _get_property(db: AsyncSession, property_id: str, business_id: str) -> Property:
    result = await db.execute(
        select(Property)
        .options(selectinload(Property.images))
        .where(Property.id == property_id, Property.business_id == business_id, Property.is_active == True)
    )
    prop = result.scalar_one_or_none()
    if not prop:
        raise HTTPException(404, "Propiedad no encontrada")
    return prop


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
async def list_properties(
    status:        Optional[str] = None,
    property_type: Optional[str] = None,
    operation:     Optional[str] = None,
    limit:         int = 100,
    offset:        int = 0,
    db:            AsyncSession = Depends(get_db),
    current_user:  User = Depends(get_current_user),
):
    """Lista todas las propiedades del negocio."""
    q = (
        select(Property)
        .options(selectinload(Property.images))
        .where(Property.business_id == current_user.business_id, Property.is_active == True)
        .order_by(desc(Property.created_at))
        .limit(limit).offset(offset)
    )
    if status:
        q = q.where(Property.status == PropertyStatus(status))
    if property_type:
        q = q.where(Property.property_type == PropertyType(property_type))
    if operation:
        q = q.where(Property.operation_type == OperationType(operation))

    result = await db.execute(q)
    props  = result.scalars().all()

    total = await db.scalar(
        select(func.count(Property.id))
        .where(Property.business_id == current_user.business_id, Property.is_active == True)
    )

    # Conteos por estado
    counts_result = await db.execute(
        select(Property.status, func.count(Property.id))
        .where(Property.business_id == current_user.business_id, Property.is_active == True)
        .group_by(Property.status)
    )
    counts = {row[0].value: row[1] for row in counts_result.fetchall()}

    return {
        "properties": [_serialize(p) for p in props],
        "total":      total or 0,
        "by_status":  counts,
    }


@router.get("/images/all")
async def list_all_images(
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna todas las imágenes de propiedades del negocio para el picker de contenido.
    """
    result = await db.execute(
        select(Property)
        .options(selectinload(Property.images))
        .where(Property.business_id == current_user.business_id, Property.is_active == True)
        .order_by(desc(Property.created_at))
    )
    props = result.scalars().all()

    images = []
    for p in props:
        # Incluir portada primero si existe
        all_imgs = list(p.images or [])
        for img in all_imgs:
            images.append({
                "id":            img.id,
                "url":           img.url,
                "caption":       img.caption,
                "is_cover":      img.is_cover,
                "property_id":   p.id,
                "property_title": p.title,
                "property_type": p.property_type.value if p.property_type else None,
                "price":         p.price,
                "currency":      p.currency or "USD",
                "city":          p.city,
            })
    return {"images": images, "total": len(images)}


@router.post("")
async def create_property(
    data:         PropertyCreate,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea una nueva propiedad."""
    try:
        prop = Property(
            id=str(uuid.uuid4()),
            business_id=current_user.business_id,
            title=data.title,
            property_type=PropertyType(data.property_type),
            operation_type=OperationType(data.operation_type),
            status=PropertyStatus(data.status),
            description=data.description,
            address=data.address,
            neighborhood=data.neighborhood,
            city=data.city,
            state=data.state,
            price=data.price,
            currency=data.currency,
            bedrooms=data.bedrooms,
            bathrooms=data.bathrooms,
            parking_spaces=data.parking_spaces,
            area_m2=data.area_m2,
            construction_m2=data.construction_m2,
            floor=data.floor,
            total_floors=data.total_floors,
            age_years=data.age_years,
            amenities=data.amenities,
            features=data.features,
        )
        db.add(prop)
        await db.commit()
        await db.refresh(prop)
        # Reload with images
        result = await db.execute(
            select(Property).options(selectinload(Property.images)).where(Property.id == prop.id)
        )
        prop = result.scalar_one()
        return _serialize(prop)
    except ValueError as e:
        raise HTTPException(400, f"Valor inválido: {e}")


@router.get("/{property_id}")
async def get_property(
    property_id:  str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = await _get_property(db, property_id, current_user.business_id)
    return _serialize(prop)


@router.patch("/{property_id}")
async def update_property(
    property_id: str,
    data:        PropertyUpdate,
    db:          AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = await _get_property(db, property_id, current_user.business_id)

    update_fields = data.model_dump(exclude_none=True)
    for k, v in update_fields.items():
        if k == "property_type" and v:
            setattr(prop, k, PropertyType(v))
        elif k == "operation_type" and v:
            setattr(prop, k, OperationType(v))
        elif k == "status" and v:
            setattr(prop, k, PropertyStatus(v))
        else:
            setattr(prop, k, v)

    await db.commit()
    await db.refresh(prop)
    result = await db.execute(
        select(Property).options(selectinload(Property.images)).where(Property.id == prop.id)
    )
    prop = result.scalar_one()
    return _serialize(prop)


@router.delete("/{property_id}")
async def delete_property(
    property_id:  str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prop = await _get_property(db, property_id, current_user.business_id)
    prop.is_active = False
    await db.commit()
    return {"ok": True}


# ── Image endpoints ───────────────────────────────────────────────────────────

@router.post("/{property_id}/images")
async def upload_image(
    property_id:  str,
    file:         UploadFile = File(...),
    caption:      str = Form(None),
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Sube una imagen para la propiedad y la guarda en R2 o disco."""
    prop = await _get_property(db, property_id, current_user.business_id)

    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Tipo de archivo no permitido: {content_type}. Use JPEG, PNG o WebP.")

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"La imagen no debe superar {MAX_SIZE_MB}MB.")

    # Save via storage_service (R2 if configured, otherwise local)
    storage_key, image_url = await save_media(
        business_id=current_user.business_id,
        original_filename=file.filename or "image.jpg",
        file_bytes=content,
        mime_type=content_type,
    )

    existing_count = await db.scalar(
        select(func.count(PropertyImage.id)).where(PropertyImage.property_id == property_id)
    ) or 0
    is_cover = (existing_count == 0)

    img = PropertyImage(
        id=str(uuid.uuid4()),
        property_id=property_id,
        url=image_url,
        caption=caption or None,
        is_cover=is_cover,
        order=existing_count,
    )
    db.add(img)

    if is_cover:
        prop.cover_image_url = image_url

    await db.commit()
    await db.refresh(img)

    return {
        "id":       img.id,
        "url":      img.url,
        "caption":  img.caption,
        "is_cover": img.is_cover,
        "order":    img.order,
    }

    # If first image, set property cover
    if is_cover:
        prop.cover_image_url = image_url

    await db.commit()
    await db.refresh(img)

    return {
        "id":       img.id,
        "url":      img.url,
        "caption":  img.caption,
        "is_cover": img.is_cover,
        "order":    img.order,
    }


@router.post("/{property_id}/images/{image_id}/cover")
async def set_cover_image(
    property_id: str,
    image_id:    str,
    db:          AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Establece una imagen como portada de la propiedad."""
    prop = await _get_property(db, property_id, current_user.business_id)

    # Unset all covers
    for img in prop.images:
        img.is_cover = False

    # Set new cover
    target = next((i for i in prop.images if i.id == image_id), None)
    if not target:
        raise HTTPException(404, "Imagen no encontrada")
    target.is_cover = True
    prop.cover_image_url = target.url

    await db.commit()
    return {"ok": True, "cover_url": target.url}


@router.delete("/{property_id}/images/{image_id}")
async def delete_image(
    property_id:  str,
    image_id:     str,
    db:           AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina una imagen de la propiedad."""
    prop = await _get_property(db, property_id, current_user.business_id)

    target = next((i for i in prop.images if i.id == image_id), None)
    if not target:
        raise HTTPException(404, "Imagen no encontrada")

    was_cover = target.is_cover
    await db.delete(target)

    # Reassign cover if needed
    remaining = [i for i in prop.images if i.id != image_id]
    if was_cover and remaining:
        remaining[0].is_cover = True
        prop.cover_image_url = remaining[0].url
    elif not remaining:
        prop.cover_image_url = None

    # Attempt to delete from storage (R2 or local) — best-effort
    try:
        parts = target.url.rstrip("/").split("/")
        storage_key = "/".join(parts[-2:])
        await delete_media(storage_key)
    except Exception:
        pass

    await db.commit()
    return {"ok": True}
