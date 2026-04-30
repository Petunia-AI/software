from sqlalchemy import String, Text, JSON, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    website: Mapped[str] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[str] = mapped_column(String(500), nullable=True)

    # Configuración del negocio para el agente
    product_description: Mapped[str] = mapped_column(Text, nullable=True)
    pricing_info: Mapped[str] = mapped_column(Text, nullable=True)
    target_customer: Mapped[str] = mapped_column(Text, nullable=True)
    value_proposition: Mapped[str] = mapped_column(Text, nullable=True)
    objection_handling: Mapped[dict] = mapped_column(JSON, default=dict)
    faqs: Mapped[dict] = mapped_column(JSON, default=dict)

    # Canales habilitados
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    instagram_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    webchat_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # WhatsApp config
    whatsapp_phone: Mapped[str] = mapped_column(String(20), nullable=True)
    whatsapp_token: Mapped[str] = mapped_column(String(500), nullable=True)

    # Instagram config
    instagram_account_id:  Mapped[str] = mapped_column(String(100), nullable=True)
    instagram_page_id:     Mapped[str] = mapped_column(String(100), nullable=True)

    # Meta WhatsApp Business Cloud API
    meta_phone_number_id: Mapped[str] = mapped_column(String(100), nullable=True)
    meta_wa_token:        Mapped[str] = mapped_column(String(1000), nullable=True)

    # Meta Instagram DMs + Facebook Messenger (shared Page Access Token)
    meta_page_token: Mapped[str] = mapped_column(String(1000), nullable=True)
    messenger_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Meta OAuth connection state
    meta_connected: Mapped[bool] = mapped_column(Boolean, default=False)
    meta_user_id: Mapped[str] = mapped_column(String(100), nullable=True)
    meta_user_name: Mapped[str] = mapped_column(String(255), nullable=True)
    meta_long_lived_token: Mapped[str] = mapped_column(String(1000), nullable=True)
    meta_token_expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    meta_pages: Mapped[dict] = mapped_column(JSON, default=list)  # [{id, name, access_token, ig_id}]
    meta_wa_business_id: Mapped[str] = mapped_column(String(100), nullable=True)  # WhatsApp Business Account ID
    meta_selected_page_id: Mapped[str] = mapped_column(String(100), nullable=True)  # Page selected for Messenger/IG
    meta_selected_wa_phone_id: Mapped[str] = mapped_column(String(100), nullable=True)  # WA phone selected

    @property
    def meta_wa_token_set(self) -> bool:
        return bool(self.meta_wa_token)

    @property
    def meta_page_token_set(self) -> bool:
        return bool(self.meta_page_token)

    # LinkedIn
    linkedin_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    linkedin_access_token: Mapped[str] = mapped_column(String(2000), nullable=True)
    linkedin_refresh_token: Mapped[str] = mapped_column(String(2000), nullable=True)
    linkedin_token_expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    linkedin_org_id: Mapped[str] = mapped_column(String(100), nullable=True)   # URN organización (urn:li:organization:xxx)
    linkedin_person_urn: Mapped[str] = mapped_column(String(100), nullable=True)  # urn:li:person:xxx
    linkedin_name: Mapped[str] = mapped_column(String(255), nullable=True)

    # TikTok
    tiktok_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    tiktok_access_token: Mapped[str] = mapped_column(String(2000), nullable=True)
    tiktok_refresh_token: Mapped[str] = mapped_column(String(2000), nullable=True)
    tiktok_token_expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    tiktok_open_id: Mapped[str] = mapped_column(String(100), nullable=True)    # identificador de cuenta TikTok
    tiktok_username: Mapped[str] = mapped_column(String(255), nullable=True)

    # Zernio — Social Media Multi-Platform OAuth
    zernio_profile_id: Mapped[str] = mapped_column(String(500), nullable=True)           # profileId único por cliente
    zernio_ref_id: Mapped[str] = mapped_column(String(255), nullable=True)               # refId = business_id
    zernio_connected_platforms: Mapped[dict] = mapped_column(JSON, default=list)         # [{"platform":"instagram","accountId":"acc_xxx"},...]
    zernio_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    zernio_autoresponder_enabled: Mapped[bool] = mapped_column(Boolean, default=False)   # responder comentarios/DMs automáticamente
    zernio_autoresponder_channels: Mapped[dict] = mapped_column(JSON, default=list)      # ["facebook","instagram",...] canales habilitados

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    users: Mapped[list["User"]] = relationship("User", back_populates="business")
    leads: Mapped[list["Lead"]] = relationship("Lead", back_populates="business")
    conversations: Mapped[list["Conversation"]] = relationship("Conversation", back_populates="business")
    agent_configs: Mapped[list["AgentConfig"]] = relationship("AgentConfig", back_populates="business")
    subscription: Mapped["Subscription"] = relationship("Subscription", back_populates="business", uselist=False)  # type: ignore
