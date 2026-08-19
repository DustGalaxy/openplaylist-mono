# pyright: reportConstantRedefinition=false
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Добавляем переменную режима: "dev" (по умолчанию) или "prod"
    MODE: str = Field(alias="MODE", default="dev")
    PROJECT_DOMAIN: str = "http://localhost:3000"

    IS_TESTING: bool = False

    SESSION_LIVE_TIME: int = Field(alias="SESSION_LIVE_TIME", default=60 * 60 * 24 * 7)
    COOKIE_NAME: str = Field(alias="COOKIE_NAME", default="auth")

    JWT_SECRET_KEY: str = Field(alias="JWT_SECRET_KEY")
    JWT_PUBLIC_KEY: str = Field(alias="JWT_PUBLIC_KEY")
    JWT_ALGORITHM: str = Field(alias="JWT_ALGORITHM", default="RS256")
    JWT_ISSUER: str = Field(alias="JWT_ISSUER", default="ravlik")

    ADMIN_PASSWORD_HASH: str = Field(alias="ADMIN_PASSWORD_HASH", default="")

    TWITCH_CLIENT_ID: str = Field(alias="TWITCH_CLIENT_ID", default="vsil95c2am4rgvbgdax1o4a1u003mx")
    TWITCH_CLIENT_SECRET: str = Field(alias="TWITCH_CLIENT_SECRET")
    TWITCH_REDIRECT_URI: str = ""  # Вычисляется динамически
    TWITCH_ADMIN_REDIRECT_URI: str = ""  # Вычисляется динамически для админки
    TWITCH_ADMIN_DEFAULT_SCOPES: str = Field(
        alias="TWITCH_ADMIN_DEFAULT_SCOPES",
        default="user:read:email channel:read:subscriptions chat:read chat:edit",
    )
    TWITCH_ADMIN_STATE: str = Field(alias="TWITCH_ADMIN_STATE", default="admin_oauth_state")
    TWITCH_URL: str = Field(default="https://id.twitch.tv")
    TWITCH_SCOPES: str = Field(default="user:read:email channel:bot channel:read:redemptions channel:manage:redemptions")

    DA_APP_ID: str = Field(alias="DA_APP_ID", default="18779")
    DA_API_KEY: str = Field(alias="DA_API_KEY")
    DA_REDIRECT_URI: str = ""  # Вычисляется динамически
    DA_SCOPES: str = Field(default="oauth-user-show oauth-donation-subscribe")

    DA_AUTHORIZATION_URL: str = Field(default="https://www.donationalerts.com/oauth/authorize")
    DA_TOKEN_URL: str = Field(default="https://www.donationalerts.com/oauth/token")
    DA_API_BASE_URL: str = Field(default="https://www.donationalerts.com/api/v1")
    DA_CENTRIFUGO_URL: str = Field(default="wss://centrifugo.donationalerts.com/connection/websocket")

    SELF_HOST: str = Field(alias="SELF_HOST", default="0.0.0.0")
    SELF_PORT: int = Field(alias="SELF_PORT", default=8000)
    SELF_LOG_LEVEL: str = Field(alias="SELF_LOG_LEVEL", default="info")
    SELF_RELOAD: bool = Field(alias="SELF_RELOAD", default=True)

    DB_URL: str = Field(alias="DB_URL")
    RABBITMQ_URL: str = Field(alias="RABBITMQ_URL")
    REDIS_URL: str = Field(alias="REDIS_URL")

    YOUTUBE_API_KEY: str = Field(alias="YOUTUBE_API_KEY")

    GOOGLE_URL: str = Field(alias="GOOGLE_URL", default="https://oauth2.googleapis.com")
    GOOGLE_CLIENT_ID: str = Field(
        alias="GOOGLE_CLIENT_ID", default="684341768922-sd9fgqd8l3vhr7e4iep5c3ddqsgboaic.apps.googleusercontent.com"
    )
    GOOGLE_CLIENT_SECRET: str = Field(alias="GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = ""

    DONATEX_URL: str = Field(alias="DONATEX_URL", default="https://donatex.gg/api")
    DONATEX_CLIENT_ID: str = Field(alias="DONATEX_CLIENT_ID", default="2bca17b98ef34185")
    DONATEX_CLIENT_SECRET: str = Field(alias="DONATEX_CLIENT_SECRET")
    DONATEX_REDIRECT_URI: str = ""

    EMAIL_COMFIRM_ADRESS: str = ""  # Вычисляется динамически
    SMTP_EMAIL_ADDRESS: str = Field(alias="SMTP_EMAIL_ADDRESS", default="midnulltest@gmail.com")
    SMTP_EMAIL_PASSWORD: str = Field(alias="SMTP_EMAIL_PASSWORD")
    SMTP_PORT: int = Field(alias="SMTP_PORT", default=587)
    SMTP_SERVER: str = Field(alias="SMTP_SERVER", default="smtp.gmail.com")

    # Валидатор, который срабатывает после загрузки всех переменных из .env
    @model_validator(mode="after")
    def compute_urls(self) -> "Settings":
        # Если в .env написано MODE=prod, меняем домен (или подтягиваем из другой переменной PROD_PROJECT_DOMAIN)
        if self.MODE == "prod":
            self.PROJECT_DOMAIN = "https://theopenplaylist.com"

        # Формируем зависимые ссылки
        self.EMAIL_COMFIRM_ADRESS = f"{self.PROJECT_DOMAIN}/email-confirm"
        self.TWITCH_REDIRECT_URI = f"{self.PROJECT_DOMAIN}/oauth-callback"

        if self.MODE == "prod":
            if not self.TWITCH_ADMIN_REDIRECT_URI:
                self.TWITCH_ADMIN_REDIRECT_URI = f"{self.PROJECT_DOMAIN}/api/admin/twitch-callback"
        else:
            self.TWITCH_ADMIN_REDIRECT_URI = "http://localhost:8000/api/admin/twitch-callback"

        self.DA_REDIRECT_URI = f"{self.PROJECT_DOMAIN}/oauth-callback"
        self.GOOGLE_REDIRECT_URI = f"{self.PROJECT_DOMAIN}/oauth-callback"
        self.DONATEX_REDIRECT_URI = f"{self.PROJECT_DOMAIN}/oauth-callback"
        return self

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()  # pyright: ignore[reportCallIssue]
