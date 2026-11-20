from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://dvarf:dvarf@localhost:5432/dvarf"
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    # Tabletop sessions run for hours; access must not force a mid-game login.
    access_token_ttl_minutes: int = 720
    # Sliding window on /auth/refresh keeps the login alive while the app is used.
    refresh_token_ttl_days: int = 90
    cors_origins: str = "http://localhost:5173"
    app_public_url: str = "http://localhost:5173"
    auth_email_stub: bool = True
    password_reset_ttl_minutes: int = 30
    email_change_ttl_minutes: int = 30
    email_verification_ttl_minutes: int = 60

    smtp_host: str = ""
    smtp_port: int = 465
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_use_ssl: bool = True

    yandex_client_id: str = ""
    yandex_client_secret: str = ""
    yandex_redirect_uri: str = "http://localhost:5173/auth/oauth/yandex/callback"

    vk_client_id: str = ""
    vk_client_secret: str = ""
    vk_redirect_uri: str = "http://localhost:8000/auth/oauth/vk/callback"
    vk_service_token: str = ""
    uploads_dir: str = "uploads"

    # W-API-06: провайдер извлечения из прозы. Без ключа/URL — только эвристики.
    # Секреты в репозиторий не класть — только через окружение.
    world_import_ai_provider: str = "auto"  # auto | stub | remote
    world_import_ai_api_key: str = ""
    world_import_ai_base_url: str = ""

    # W-API-10: MCP streamable HTTP (хосты для DNS-rebinding allowlist, через запятую).
    mcp_allowed_hosts: str = ""
    mcp_port: int = 8100

    # ADM-01: админ-панель. По умолчанию выключена; на прод не включать этой пачкой.
    # Первый полный админ — почта из окружения (значение в git не класть).
    admin_panel_enabled: bool = False
    admin_bootstrap_email: str = ""
    # P24-01: редакция 2024 закрыта до финальной пачки открытия (P24-M06).
    # Env: RULES_EDITION_2024_OPEN=true|false. По умолчанию выключен.
    rules_edition_2024_open: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
