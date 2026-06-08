from abc import abstractmethod
from typing import Protocol, TypedDict, overload

from pydantic import BaseModel
from faststream.rabbit import RabbitQueue


class PlatformUser(BaseModel):
    id: str

    username: str
    avatar_url: str

    email: str | None
    email_verified: bool

    access_token: str
    refresh_token: str
    expires_at: int


class AuthStrategy(Protocol):
    bot_connect_request_queue: RabbitQueue

    @abstractmethod
    async def fetch_identity(self, code: str) -> PlatformUser: ...

    @abstractmethod
    def allow_email_collision(self) -> bool: ...


class AuthStrategyPKCE(Protocol):
    bot_connect_request_queue: RabbitQueue

    @abstractmethod
    async def fetch_identity(self, code: str, code_verifier: str) -> PlatformUser: ...

    @abstractmethod
    def allow_email_collision(self) -> bool: ...
