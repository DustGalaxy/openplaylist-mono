from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SESSION_LIVE_TIME: int = Field(alias="SESSION_LIVE_TIME")
    COOKIE_NAME: str = Field(alias="COOKIE_NAME")

    JWT_SECRET_KEY: str = Field(alias="JWT_SECRET_KEY")
    JWT_PUBLIC_KEY: str = Field(alias="JWT_PUBLIC_KEY") 
    JWT_ALGORITHM: str = Field(alias="JWT_ALGORITHM")
    JWT_ISSUER: str = Field(alias="JWT_ISSUER")

    TWITCH_CLIENT_ID: str = Field(alias="TWITCH_CLIENT_ID")
    TWITCH_CLIENT_SECRET: str = Field(alias="TWITCH_CLIENT_SECRET")
    TWITCH_REDIRECT_URI: str = Field(alias="TWITCH_REDIRECT_URI")
    TWITCH_URL: str = Field(alias="TWITCH_URL")
    TWITCH_SCOPES: str = Field(alias="TWITCH_SCOPES")

    DA_APP_ID: str = Field(alias="DA_APP_ID")
    DA_API_KEY: str = Field(alias="DA_API_KEY")
    DA_REDIRECT_URI: str = Field(alias="DA_REDIRECT_URI")
    DA_SCOPES: str = "oauth-user-show oauth-donation-subscribe"
    DA_AUTHORIZATION_URL: str = "https://www.donationalerts.com/oauth/authorize"
    DA_TOKEN_URL: str = "https://www.donationalerts.com/oauth/token"
    DA_API_BASE_URL: str = "https://www.donationalerts.com/api/v1"
    DA_CENTRIFUGO_URL: str = "wss://centrifugo.donationalerts.com/connection/websocket"

    SELF_HOST: str = Field(alias="SELF_HOST")
    SELF_PORT: int = Field(alias="SELF_PORT")
    SELF_LOG_LEVEL: str = Field(alias="SELF_LOG_LEVEL")
    SELF_RELOAD: bool = Field(alias="SELF_RELOAD")

    DB_URL: str = Field(alias="DB_URL")
    RABBITMQ_URL: str = Field(alias="RABBITMQ_URL")
    REDIS_URL: str = Field(alias="REDIS_URL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()  # pyright: ignore[reportCallIssue]
