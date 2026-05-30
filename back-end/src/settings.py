from pydantic import Field
from pydantic_settings import BaseSettings


PROJECT_DOMAIN = "openplaylist.localhost"


class Settings(BaseSettings):
    IS_TESTING: bool = False

    SESSION_LIVE_TIME: int = Field(alias="SESSION_LIVE_TIME", default=60 * 60 * 24 * 7)
    COOKIE_NAME: str = Field(alias="COOKIE_NAME", default="auth")

    JWT_SECRET_KEY: str = Field(alias="JWT_SECRET_KEY")
    JWT_PUBLIC_KEY: str = Field(alias="JWT_PUBLIC_KEY")
    JWT_ALGORITHM: str = Field(alias="JWT_ALGORITHM", default="RS256")
    JWT_ISSUER: str = Field(alias="JWT_ISSUER", default="ravlik")

    TWITCH_CLIENT_ID: str = Field(alias="TWITCH_CLIENT_ID", default="vsil95c2am4rgvbgdax1o4a1u003mx")
    TWITCH_CLIENT_SECRET: str = Field(alias="TWITCH_CLIENT_SECRET")
    TWITCH_REDIRECT_URI: str = Field(alias="TWITCH_REDIRECT_URI", default=f"https://{PROJECT_DOMAIN}/oauth-callback")
    TWITCH_URL: str = Field(alias="TWITCH_URL", default="https://id.twitch.tv")
    TWITCH_SCOPES: str = Field(alias="TWITCH_SCOPES", default="user:read:email")

    DA_APP_ID: str = Field(alias="DA_APP_ID", default="18779")
    DA_API_KEY: str = Field(alias="DA_API_KEY")
    DA_REDIRECT_URI: str = Field(alias="DA_REDIRECT_URI", default=f"https://{PROJECT_DOMAIN}/oauth-callback")
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

    EMAIL_COMFIRM_ADRESS: str = Field(alias="EMAIL_COMFIRM_ADRESS", default=f"http://{PROJECT_DOMAIN}/email-confirm")
    SMTP_EMAIL_ADDRESS: str = Field(alias="SMTP_EMAIL_ADDRESS", default="midnulltest@gmail.com")
    SMTP_EMAIL_PASSWORD: str = Field(alias="SMTP_EMAIL_PASSWORD")
    SMTP_PORT: int = Field(alias="SMTP_PORT", default=587)
    SMTP_SERVER: str = Field(alias="SMTP_SERVER", default="smtp.gmail.com")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()  # pyright: ignore[reportCallIssue]
