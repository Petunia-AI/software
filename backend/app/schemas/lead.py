from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class LeadCreate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: str = "webchat"


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    stage: Optional[str] = None
    notes: Optional[str] = None
    estimated_value: Optional[float] = None
    next_followup_at: Optional[datetime] = None


class LeadOut(BaseModel):
    id: str
    business_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    stage: str
    source: str
    qualification_score: float
    budget: Optional[str] = None
    authority: Optional[str] = None
    need: Optional[str] = None
    timeline: Optional[str] = None
    assigned_agent_type: str
    estimated_value: Optional[float] = None
    notes: Optional[str] = None
    last_contacted_at: Optional[datetime] = None
    next_followup_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
