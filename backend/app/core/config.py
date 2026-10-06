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
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 30
    cors_origins: str = "http://localhost:5173"
    app_public_url: str = "http://localhost:5173"
    auth_email_stub: bool = True
    password_reset_ttl_minutes: int = 30

    yandex_client_id: str = ""
    yandex_client_secret: str = ""
    yandex_redirect_uri: str = "http://localhost:5173/auth/oauth/yandex/callback"

    vk_client_id: str = ""
    vk_client_secret: str = ""
    vk_redirect_uri: str = "http://localhost:8000/auth/oauth/vk/callback"
    vk_service_token: str = ""

    uploads_dir: str = "uploads"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
