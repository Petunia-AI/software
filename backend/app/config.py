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

    # URL pública del backend (para construir URLs de archivos subidos)
    backend_url: str = "http://localhost:8000"

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

    # Meta OAuth (Facebook Login for Business)
    meta_app_id:     str = ""   # App ID de la Meta App
    meta_app_secret: str = ""   # App Secret de la Meta App (para OAuth)
    meta_oauth_redirect_uri: str = ""  # e.g. https://tu-dominio.com/meta/callback
    meta_config_id:  str = ""   # Facebook Login Configuration ID (para Embedded Signup)

    # Stripe
    stripe_secret_key:      str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret:  str = ""

    # Facebook Pages (para publicar en Facebook)
    facebook_page_id:    str = ""
    facebook_page_token: str = ""

    # Instagram Business Account ID (para publicar)
    instagram_account_id: str = ""

    # LinkedIn OAuth
    linkedin_client_id:     str = ""
    linkedin_client_secret: str = ""
    linkedin_oauth_redirect_uri: str = ""
    # Legacy (token estático, deprecado)
    linkedin_access_token: str = ""
    linkedin_author_urn:   str = ""

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

    # xAI Grok — Generación de videos (grok-imagine-video)
    xai_api_key: str = ""

    # HeyGen — Generación de videos con avatares IA (solo plan Premium)
    heygen_api_key: str = ""

    # TikTok OAuth
    tiktok_client_key:    str = ""
    tiktok_client_secret: str = ""
    tiktok_oauth_redirect_uri: str = ""
    # Legacy (token estático, deprecado)
    tiktok_access_token: str = ""

    # Cloudflare R2 / S3 — almacenamiento de media (opcional)
    # Si no se configura, se usa almacenamiento local en uploads/media/
    r2_account_id:       str = ""    # Cloudflare Account ID
    r2_access_key_id:    str = ""    # R2 Access Key ID
    r2_secret_access_key: str = ""   # R2 Secret Access Key
    r2_bucket_name:      str = ""    # Nombre del bucket R2
    r2_public_url:       str = ""    # URL pública del bucket (CDN o custom domain)
    tiktok_open_id:      str = ""

    # Zernio — Social Media Multi-Platform OAuth
    zernio_api_key: str = ""   # API Key de Zernio (sk_...)

    # Google OAuth2 (Gmail CRM + Google Calendar / Meet integration)
    google_client_id:     str = ""   # Google Cloud Console → OAuth 2.0 Client ID
    google_client_secret: str = ""   # Google Cloud Console → OAuth 2.0 Client Secret

    # Gemini API (meeting transcription + summary)
    gemini_api_key: str = ""   # Google AI Studio → API Key

    # Zoom OAuth (meetings integration)
    zoom_client_id:     str = ""   # Zoom App → Client ID
    zoom_client_secret: str = ""   # Zoom App → Client Secret

    # Microsoft OAuth2 (Outlook CRM integration)
    microsoft_client_id:     str = ""  # Azure AD → App registrations → Application (client) ID
    microsoft_client_secret: str = ""  # Azure AD → Certificates & secrets
    microsoft_tenant_id:     str = "common"  # 'common' para cuentas personales y organizacionales

    # SendGrid — Email marketing & campaigns
    sendgrid_api_key:       str = ""   # SendGrid API Key (SG.xxx)
    sendgrid_from_email:    str = ""   # Verified sender email in SendGrid
    sendgrid_from_name:     str = "Petunia AI"
    sendgrid_webhook_key:   str = ""   # SendGrid Event Webhook verification key

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
