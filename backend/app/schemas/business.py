from pydantic import BaseModel
from typing import Optional, Dict


class BusinessCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    product_description: Optional[str] = None
    pricing_info: Optional[str] = None
    target_customer: Optional[str] = None
    value_proposition: Optional[str] = None


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    product_description: Optional[str] = None
    pricing_info: Optional[str] = None
    target_customer: Optional[str] = None
    value_proposition: Optional[str] = None
    objection_handling: Optional[Dict] = None
    faqs: Optional[Dict] = None
    whatsapp_enabled: Optional[bool] = None
    webchat_enabled: Optional[bool] = None
    instagram_enabled: Optional[bool] = None
    whatsapp_phone: Optional[str] = None
    instagram_account_id: Optional[str] = None
    instagram_page_id: Optional[str] = None
    meta_phone_number_id: Optional[str] = None
    meta_wa_token: Optional[str] = None  # write-only: se guarda, no se devuelve en GET
    meta_page_token: Optional[str] = None  # write-only: Page Access Token para IG DMs + Messenger
    messenger_enabled: Optional[bool] = None


class MetaPageOut(BaseModel):
    id: str
    name: str
    has_instagram: bool = False
    instagram_id: Optional[str] = None

class MetaConnectionOut(BaseModel):
    connected: bool = False
    user_name: Optional[str] = None
    pages: list[MetaPageOut] = []
    selected_page_id: Optional[str] = None
    selected_wa_phone_id: Optional[str] = None
    wa_business_id: Optional[str] = None
    token_expires_at: Optional[str] = None

class BusinessOut(BaseModel):
    id: str
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    product_description: Optional[str] = None
    pricing_info: Optional[str] = None
    target_customer: Optional[str] = None
    value_proposition: Optional[str] = None
    whatsapp_enabled: bool
    webchat_enabled: bool
    instagram_enabled: bool = False
    whatsapp_phone: Optional[str] = None
    instagram_account_id: Optional[str] = None
    instagram_page_id: Optional[str] = None
    meta_phone_number_id: Optional[str] = None
    meta_wa_token_set: bool = False
    meta_page_token_set: bool = False
    messenger_enabled: bool = False
    meta_connected: bool = False
    meta_user_name: Optional[str] = None
    meta_selected_page_id: Optional[str] = None
    meta_selected_wa_phone_id: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
