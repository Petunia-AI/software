from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Agente de Ventas AI"
    app_env: str = "development"
    secret_key: str = "dev-secret-key-change-in-production-min-32-chars"
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/agente_ventas"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Anthropic
    anthropic_api_key: str = ""

    # WhatsApp / Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"

    # JWT
    access_token_expire_minutes: int = 10080  # 7 days

    # CORS
    frontend_url: str = "http://localhost:3000"

    # Claude model
    claude_model: str = "claude-sonnet-4-6"

    # Email — Resend
    resend_api_key:   str = ""
    email_from:       str = "noreply@agenteventas.ai"
    email_from_name:  str = "Agente de Ventas AI"

    # Instagram / Meta Graph API
    instagram_access_token: str = ""   # Page Access Token
    instagram_app_secret:   str = ""   # Para verificar firma HMAC
    instagram_verify_token: str = "agente_ventas_ig_verify"  # Hub verify token

    # Meta WhatsApp Business Cloud API
    meta_wa_verify_token: str = "agente_ventas_wa_verify"  # Hub verify token para webhook
    meta_wa_app_secret:   str = ""   # App Secret de la Meta App (para verificar firmas)

    # Stripe
    stripe_secret_key:      str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret:  str = ""

    # Facebook Pages (para publicar en Facebook)
    facebook_page_id:    str = ""
    facebook_page_token: str = ""

    # Instagram Business Account ID (para publicar)
    instagram_account_id: str = ""

    # LinkedIn
    linkedin_access_token: str = ""
    linkedin_author_urn:   str = ""   # urn:li:organization:12345 o urn:li:person:xxx

    # X / Twitter
    twitter_api_key:       str = ""
    twitter_api_secret:    str = ""
    twitter_access_token:  str = ""
    twitter_access_secret: str = ""

    # Stripe Price IDs (reemplazar con los reales en .env)
    stripe_price_starter:    str = "price_starter_monthly"
    stripe_price_pro:        str = "price_pro_monthly"
    stripe_price_enterprise: str = "price_enterprise_monthly"

    # fal.ai — Generación de imágenes (FLUX model)
    fal_api_key: str = ""

    # HeyGen — Generación de videos con avatares IA (solo plan Premium)
    heygen_api_key: str = ""

    # TikTok (para publicación)
    tiktok_access_token: str = ""
    tiktok_open_id:      str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Railway inyecta postgresql:// o postgres://, pero asyncpg necesita postgresql+asyncpg://"""
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
