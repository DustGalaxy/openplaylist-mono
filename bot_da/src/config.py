from pydantic import model_validator
from pydantic_settings import BaseSettings  # Для загрузки конфига

PROJECT_DOMAIN: str = "http://localhost:3000"
# --- Загрузка конфигурации ---
class Settings(BaseSettings):
    APP_ID: str = "18779"
    API_KEY: str = "oauth-user-show oauth-donation-subscribe"
    REDIRECT_URI: str = ""
    SESSION_SECRET_KEY: str 

    RABBITMQ_URL: str
    DB_URL: str
    REDIS_URL: str

    DA_SCOPES: str = "oauth-user-show oauth-donation-subscribe"
    DA_AUTHORIZATION_URL: str = "https://www.donationalerts.com/oauth/authorize"
    DA_TOKEN_URL: str = "https://www.donationalerts.com/oauth/token"
    DA_API_BASE_URL: str = "https://www.donationalerts.com/api/v1"
    DA_CENTRIFUGO_URL: str = "wss://centrifugo.donationalerts.com/connection/websocket"

    @model_validator(mode="after")
    def compute_urls(self) -> "Settings":
        # Если в .env написано MODE=prod, меняем домен (или подтягиваем из другой переменной PROD_PROJECT_DOMAIN)

        self.PROJECT_DOMAIN = "https://openplaylist.midnull.space"

        # Формируем зависимые ссылки
        self.REDIRECT_URI = f"{self.PROJECT_DOMAIN}/oauth-callback"
        return self

settings = Settings()  # type: ignore # Загружаем настройки при старте
