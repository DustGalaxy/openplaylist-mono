from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ConfigClass(BaseSettings):
    RABBITMQ_URL: str = Field(alias="RABBITMQ_URL")
    REDIS_URL: str = Field(alias="REDIS_URL")

    TWITCH_CLIENT_SECRET: str = Field(
        validation_alias=AliasChoices("TWITCH_CLIENT_SECRET", "TWICTH_CLIENT_SECRET")
    )
    TWITCH_CLIENT_ID: str = Field(alias="TWITCH_CLIENT_ID")

    BOT_ID: str = Field(alias="BOT_ID")
    OWNER_ID: str = Field(alias="OWNER_ID")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = ConfigClass() # pyright: ignore[reportCallIssue]
