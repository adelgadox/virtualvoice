from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "VirtualVoice API"
    debug: bool = False

    # Database
    database_url: str
    pgbouncer_mode: bool = False

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # CORS
    frontend_url: str = "http://localhost:3000"

    # Proxy
    trusted_proxy_ips: str = "127.0.0.1"

    # LLM Providers
    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Google OAuth (for SSO)
    google_client_id: str = ""
    google_client_secret: str = ""

    # Meta / Facebook Graph API
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_webhook_verify_token: str = ""
    meta_oauth_redirect_uri: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
