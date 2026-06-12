from abc import abstractmethod
from typing import Protocol, TypedDict, overload

from pydantic import BaseModel
from faststream.rabbit import RabbitQueue

from src._types import IntegrationPlatform, AuthFlow, PlatformCap, IntegrationType


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


class IntegrationStrategy(Protocol):
    meta: PlatformMeta

    async def fetch_identity(
        self,
        code: str | None = None,
        code_verifier: str | None = None,
        user_key: str | None = None,
    ) -> PlatformAuthResult: ...

    def get_bot_queue(self) -> RabbitQueue | None:
        return None
