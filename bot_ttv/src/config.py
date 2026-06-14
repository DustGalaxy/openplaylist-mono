from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ConfigClass(BaseSettings):
    RABBITMQ_URL: str = Field(alias="RABBITMQ_URL")
    REDIS_URL: str = Field(alias="REDIS_URL")

    TWICTH_CLIENT_SECRET: str = Field(alias="TWICTH_CLIENT_SECRET")
    TWITCH_CLIENT_ID: str = Field(alias="TWITCH_CLIENT_ID")

    BOT_ID: str = Field(alias="BOT_ID")
    OWNER_ID: str = Field(alias="OWNER_ID")

    model_config = SettingsConfigDict(env_file=".env")

settings = ConfigClass() # pyright: ignore[reportCallIssue]
