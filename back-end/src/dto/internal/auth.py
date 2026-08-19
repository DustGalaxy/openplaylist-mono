from typing import Any, Protocol

from faststream.rabbit import RabbitQueue
from pydantic import BaseModel

from src._types import AuthFlow, IntegrationPlatform, IntegrationType, PlatformCap


class PlatformTokens(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_at: int | None = None
    token_type: str = "Bearer"


class PlatformUser(BaseModel):
    id: str
    username: str
    avatar_url: str
    email: str | None = None
    email_verified: bool = False


class PlatformAuthResult(BaseModel):
    user: PlatformUser
    tokens: PlatformTokens


class PlatformMeta(BaseModel):
    platform: IntegrationPlatform
    integration_type: IntegrationType
    auth_flow: AuthFlow
    allow_email_collision: bool = False
    bot_capabilities: set[PlatformCap] = set()


# --- Единый протокол стратегии ---


class RefreshTokenStrategy(Protocol):
    async def refresh_token(self, refresh_token: str) -> Any: ...


class IntegrationStrategy(Protocol):
    meta: PlatformMeta
    bot_settings_schema: type[BaseModel] | None = None

    async def fetch_identity(
        self,
        code: str | None = None,
        code_verifier: str | None = None,
        user_key: str | None = None,
    ) -> PlatformAuthResult: ...

    def get_bot_queue(self) -> RabbitQueue | None:
        return None

    def get_bot_settings_queue(self) -> RabbitQueue | None:
        return None

    def get_bot_disconect_queue(self) -> RabbitQueue | None:
        return None
