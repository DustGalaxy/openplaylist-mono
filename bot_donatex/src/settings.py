from typing import Literal

from pydantic import model_validator
from pydantic.fields import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# --- Загрузка конфигурации ---
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MODE: Literal["prod", "dev"] = Field(default="dev")
    PROJECT_DOMAIN: str = "http://localhost:3000"

    RABBITMQ_URL: str = Field(default="amqp://localhost")

    DONATEX_CLIENT_ID: str = Field(alias="DONATEX_CLIENT_ID", default="2bca17b98ef34185")
    DONATEX_CLIENT_SECRET: str = Field(alias="DONATEX_CLIENT_SECRET", default="")
    DONATEX_SCOPES: str = "oauth-user-show oauth-donation-subscribe"
    DONATEX_TOKEN_URL: str = "https://donatex.gg/api/connect/token"
    DONATEX_API_BASE_URL: str = "https://donatex.gg/api"
    DONATEX_REDIRECT_URI: str = ""

    @model_validator(mode="after")
    def compute_urls(self) -> "Settings":
        if self.MODE == "prod":
            self.PROJECT_DOMAIN = "https://openplaylist.midnull.space"

        # Формируем зависимые ссылки
        self.DONATEX_REDIRECT_URI = f"{self.PROJECT_DOMAIN}/oauth-callback"
        return self


settings = Settings()  # type: ignore # Загружаем настройки при старте
