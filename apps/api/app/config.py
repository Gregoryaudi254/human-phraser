from decimal import Decimal

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://humaniser:humaniser@postgres:5432/humaniser"
    redis_url: str = "redis://redis:6379/0"
    frontend_origin: str = "http://localhost:3000"
    clerk_secret_key: str | None = None
    clerk_jwks_url: AnyHttpUrl | None = None
    clerk_issuer: str | None = None
    llm_provider: str = "gemini"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-20250514"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"
    xai_api_key: str | None = None
    xai_model: str = "grok-4.3"
    xai_base_url: str = "https://api.x.ai/v1"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    gptzero_api_key: str | None = None
    originality_api_key: str | None = None
    clerk_webhook_secret: str | None = None
    flutterwave_secret_key: str | None = None
    flutterwave_webhook_secret_hash: str | None = None
    flutterwave_base_url: str = "https://api.flutterwave.com/v3"
    flutterwave_currency: str = "USD"
    flutterwave_pro_amount: Decimal = Decimal("14")
    flutterwave_unlimited_amount: Decimal = Decimal("39")
    flutterwave_credit_pack_amount: Decimal = Decimal("5")
    flutterwave_redirect_url: str = "http://localhost:3000/account?checkout=complete"
    sentry_dsn: str | None = None
    sentry_traces_sample_rate: float = 0.1
    posthog_api_key: str | None = None
    posthog_host: str = "https://us.i.posthog.com"
    rewrite_rate_limit: str = "10/minute"
    enable_perplexity_scoring: bool = False
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_pro_price_id: str | None = None
    stripe_unlimited_price_id: str | None = None
    stripe_credit_pack_price_id: str | None = None
    stripe_portal_return_url: str = "http://localhost:3000/account"
    stripe_checkout_success_url: str = "http://localhost:3000/account?checkout=success"
    stripe_checkout_cancel_url: str = "http://localhost:3000/account?checkout=cancelled"
    environment: str = Field(default="development")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
