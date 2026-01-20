from abc import ABC, abstractmethod
from typing import Callable
from uuid import UUID

from adapters._rabbit.dto import LinkedAccountWithTokensRead


class IDonationAlertsListener(ABC):
    def __init__(self, user_id: UUID, access_token: str, refresh_token: str, expires_at: int, handler: Callable): ...

    @abstractmethod
    async def start(self): ...

    @abstractmethod
    async def stop(self): ...


class IManager(ABC):
    connections: list[IDonationAlertsListener] = []

    def __init__(self) -> None:
        pass

    @abstractmethod
    async def add_connection(self, link: LinkedAccountWithTokensRead): ...

    @abstractmethod
    async def start(self): ...

    @abstractmethod
    async def stop(self): ...

    @abstractmethod
    async def run_connection(self, client: IDonationAlertsListener): ...

    @abstractmethod
    async def stop_connection(self, client: IDonationAlertsListener): ...
