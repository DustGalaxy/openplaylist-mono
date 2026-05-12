from abc import abstractmethod
from typing import Protocol


class Tokens(Protocol):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str


class TokenStrategy(Protocol):
    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> Tokens: ...

    @abstractmethod
    def validate_token(self, tokens: Tokens) -> bool: ...
