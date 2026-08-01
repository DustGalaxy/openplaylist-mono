from abc import ABC, abstractmethod
from typing import Protocol
from uuid import UUID

from src.adapters._rabbit.dto import ConnectionData


class Handler(Protocol):
    async def __call__(self, donation_data: dict, owner_id: UUID, owner_platform_id: str) -> None: ...


class IDonateXListener(ABC):
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

    platform_user_id: str

    @abstractmethod
    async def start(self): ...

    @abstractmethod
    async def stop(self): ...


class IManager(ABC):
    connections: list[IDonateXListener] = []

    def __init__(self) -> None:
        pass

    @abstractmethod
    async def add_connection(self, data: ConnectionData): ...

    @abstractmethod
    async def start(self): ...

    @abstractmethod
    async def stop(self): ...

    @abstractmethod
    async def run_connection(self, client: IDonateXListener): ...

    @abstractmethod
    async def stop_connection(self, client: IDonateXListener): ...
