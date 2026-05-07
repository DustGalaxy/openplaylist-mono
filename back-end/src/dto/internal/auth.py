from abc import abstractmethod
from typing import Protocol, TypedDict

from faststream.rabbit import RabbitQueue


class PlatformUser(TypedDict):
    id: str

    username: str
    avatar_url: str

    email: str
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