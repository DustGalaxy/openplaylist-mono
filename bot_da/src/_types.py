from typing import Protocol
from uuid import UUID


class Handler(Protocol):
    async def __call__(self, message_str: str, owner_id: UUID, channel_name: str) -> None: ...
