from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.database import get_db
from app.models.lead import Lead, LeadStage
from app.api.auth import get_current_user
from app.models.user import User
from app.schemas.lead import LeadCreate, LeadUpdate, LeadOut
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("/", response_model=List[LeadOut])
async def list_leads(
    stage: Optional[str] = None,
    source: Optional[str] = None,
    min_score: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Lead)
        .where(Lead.business_id == current_user.business_id, Lead.is_active == True)
        .order_by(desc(Lead.created_at))
        .limit(limit)
        .offset(offset)
    )
    if stage:
        query = query.where(Lead.stage == stage)
    if source:
        query = query.where(Lead.source == source)
    if min_score is not None:
        query = query.where(Lead.qualification_score >= min_score)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.business_id == current_user.business_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return lead


@router.post("/", response_model=LeadOut, status_code=201)
async def create_lead(
    data: LeadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead = Lead(id=str(uuid.uuid4()), business_id=current_user.business_id, **data.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead


@router.patch("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: str,
    data: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.business_id == current_user.business_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(lead, key, value)
    await db.commit()
    await db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.business_id == current_user.business_id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    lead.is_active = False
    await db.commit()
