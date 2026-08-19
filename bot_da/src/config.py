from typing import Literal

from pydantic import model_validator
from pydantic.fields import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# --- Загрузка конфигурации ---
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MODE: Literal["prod", "dev"] = Field(default="dev")
    PROJECT_DOMAIN: str = "http://localhost:3000"

    APP_ID: str = "18779"
    API_KEY: str = ""
    REDIRECT_URI: str = ""

    RABBITMQ_URL: str = Field(default="amqp://localhost")

    DA_SCOPES: str = "oauth-user-show oauth-donation-subscribe"
    DA_AUTHORIZATION_URL: str = "https://www.donationalerts.com/oauth/authorize"
    DA_TOKEN_URL: str = "https://www.donationalerts.com/oauth/token"
    DA_API_BASE_URL: str = "https://www.donationalerts.com/api/v1"
    DA_CENTRIFUGO_URL: str = "wss://centrifugo.donationalerts.com/connection/websocket"

    @model_validator(mode="after")
    def compute_urls(self) -> "Settings":
        if self.MODE == "prod":
            self.PROJECT_DOMAIN = "https://theopenplaylist.com"

        self.REDIRECT_URI = f"{self.PROJECT_DOMAIN}/oauth-callback"
        return self


settings = Settings()  # type: ignore # Загружаем настройки при старте
