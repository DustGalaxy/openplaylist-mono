from abc import ABC, abstractmethod
from typing import Protocol
from uuid import UUID

from adapters._rabbit.dto import ConnectionData

class Handler(Protocol):
    async def __call__(self, message_str: str, owner_id: UUID, channel_name: str) -> None: ...

class IDonationAlertsListener(ABC):
    @abstractmethod
    def __init__(
        self,
        user_id: UUID,
        platform_user_id: str,
        access_token: str,
        refresh_token: str,
        expires_at: int,
        handler: Handler,
    ): ...

    @abstractmethod
    async def start(self): ...

    @abstractmethod
    async def stop(self): ...


class IManager(ABC):
    connections: list[IDonationAlertsListener] = []

    def __init__(self) -> None:
        pass

    @abstractmethod
    async def add_connection(self, data: ConnectionData): ...

    @abstractmethod
    async def start(self): ...

    @abstractmethod
    async def stop(self): ...

    @abstractmethod
    async def run_connection(self, client: IDonationAlertsListener): ...

    @abstractmethod
    async def stop_connection(self, client: IDonationAlertsListener): ...
