from pydantic_settings import BaseSettings  # Для загрузки конфига


# --- Загрузка конфигурации ---
class Settings(BaseSettings):
    APP_ID: str
    API_KEY: str
    REDIRECT_URI: str
    SESSION_SECRET_KEY: str

    RABBITMQ_URL: str
    DB_URL: str
    REDIS_URL: str

    DA_SCOPES: str = "oauth-user-show oauth-donation-subscribe"
    DA_AUTHORIZATION_URL: str = "https://www.donationalerts.com/oauth/authorize"
    DA_TOKEN_URL: str = "https://www.donationalerts.com/oauth/token"
    DA_API_BASE_URL: str = "https://www.donationalerts.com/api/v1"
    DA_CENTRIFUGO_URL: str = "wss://centrifugo.donationalerts.com/connection/websocket"


settings = Settings()  # type: ignore # Загружаем настройки при старте
