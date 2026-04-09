import uuid
import enum
from sqlalchemy import String, Text, JSON, DateTime, Boolean, ForeignKey, Float, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class PropertyType(str, enum.Enum):
    casa         = "casa"
    departamento = "departamento"
    terreno      = "terreno"
    local        = "local"
    oficina      = "oficina"
    bodega       = "bodega"


class OperationType(str, enum.Enum):
    venta       = "venta"
    renta       = "renta"
    venta_renta = "venta_renta"


class PropertyStatus(str, enum.Enum):
    disponible    = "disponible"
    vendida       = "vendida"
    rentada       = "rentada"
    reservada     = "reservada"
    no_disponible = "no_disponible"


class Property(Base):
    __tablename__ = "properties"

    id:          Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    business_id: Mapped[str] = mapped_column(String, ForeignKey("businesses.id"), nullable=False)

    # ── Información básica ──────────────────────────────────────────────────
    title:          Mapped[str]            = mapped_column(String(500), nullable=False)
    property_type:  Mapped[PropertyType]   = mapped_column(SAEnum(PropertyType,  name="propertytype"),  nullable=False)
    operation_type: Mapped[OperationType]  = mapped_column(SAEnum(OperationType, name="operationtype"), default=OperationType.venta)
    status:         Mapped[PropertyStatus] = mapped_column(SAEnum(PropertyStatus, name="propertystatus"), default=PropertyStatus.disponible)

    # ── Descripción ─────────────────────────────────────────────────────────
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # ── Ubicación ───────────────────────────────────────────────────────────
    address:      Mapped[str] = mapped_column(String(500), nullable=True)
    neighborhood: Mapped[str] = mapped_column(String(200), nullable=True)
    city:         Mapped[str] = mapped_column(String(100), nullable=True)
    state:        Mapped[str] = mapped_column(String(100), nullable=True)

    # ── Precio ──────────────────────────────────────────────────────────────
    price:    Mapped[float] = mapped_column(Float, nullable=True)
    currency: Mapped[str]   = mapped_column(String(10), default="USD", server_default="USD")

    # ── Ficha técnica ────────────────────────────────────────────────────────
    bedrooms:         Mapped[int]   = mapped_column(Integer, nullable=True)  # Recámaras
    bathrooms:        Mapped[float] = mapped_column(Float,   nullable=True)  # Baños (puede ser 1.5)
    parking_spaces:   Mapped[int]   = mapped_column(Integer, nullable=True)  # Cajones de estacionamiento
    area_m2:          Mapped[float] = mapped_column(Float,   nullable=True)  # Superficie total (m²)
    construction_m2:  Mapped[float] = mapped_column(Float,   nullable=True)  # Construcción (m²)
    floor:            Mapped[int]   = mapped_column(Integer, nullable=True)  # Piso (depto/oficina)
    total_floors:     Mapped[int]   = mapped_column(Integer, nullable=True)  # Total de plantas
    age_years:        Mapped[int]   = mapped_column(Integer, nullable=True)  # Antigüedad

    # ── Extras ──────────────────────────────────────────────────────────────
    amenities: Mapped[list] = mapped_column(JSON, default=list)   # ["alberca", "gym", "roof garden", ...]
    features:  Mapped[dict] = mapped_column(JSON, default=dict)   # {"mant_mensual": "$2,500", ...}

    # ── Portada ─────────────────────────────────────────────────────────────
    cover_image_url: Mapped[str] = mapped_column(String(2000), nullable=True)

    is_active:  Mapped[bool]     = mapped_column(Boolean,               default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # ── Relationships ────────────────────────────────────────────────────────
    images:   Mapped[list["PropertyImage"]] = relationship(
        "PropertyImage", back_populates="property",
        cascade="all, delete-orphan",
        order_by="PropertyImage.order",
    )
    business: Mapped["Business"] = relationship("Business")  # type: ignore


class PropertyImage(Base):
    __tablename__ = "property_images"

    id:          Mapped[str]  = mapped_column(String,  primary_key=True, default=lambda: str(uuid.uuid4()))
    property_id: Mapped[str]  = mapped_column(String,  ForeignKey("properties.id"), nullable=False)
    url:         Mapped[str]  = mapped_column(String(2000), nullable=False)
    caption:     Mapped[str]  = mapped_column(String(500), nullable=True)
    is_cover:    Mapped[bool] = mapped_column(Boolean, default=False)
    order:       Mapped[int]  = mapped_column(Integer, default=0)
    created_at:  Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    property: Mapped["Property"] = relationship("Property", back_populates="images")
