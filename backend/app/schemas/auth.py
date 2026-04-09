from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool = False
    business_id: Optional[str] = None
    plan_tier: Optional[str] = None     # "trial" | "starter" | "pro" | "enterprise"
    plan_name: Optional[str] = None     # "Trial" | "Starter" | "Profesional" | "Premium"

    class Config:
        from_attributes = True
