from abc import abstractmethod
from uuid import UUID

from simple_repository.abctract import IAsyncCrud

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.order import OrderCreate, OrderDomain

from src.models.playlist import PlaylistSchema, PlaylistCreate, PlaylistPatch

from src.orm.playlist import Playlist


from src._types import DeleteStatus, TrackSource

class IPlaylistRepository(IAsyncCrud[Playlist, PlaylistSchema, PlaylistCreate, PlaylistPatch]):
    @abstractmethod
    async def get_active_streamer_playlist(self, session: AsyncSession, owner_id: UUID) -> PlaylistSchema: ...

    @abstractmethod
    async def get_user_playlist_by_name(self, session: AsyncSession, owner_id: UUID, name: str) -> PlaylistSchema: ...

    @abstractmethod
    async def get_id_by_user_id_and_playlist_id(
        self, session: AsyncSession, user_id: UUID, playlist_id: UUID
    ) -> UUID | None: ...

    @abstractmethod
    async def get_by_string(self, session: AsyncSession, query: str) -> list[PlaylistSchema]: ...

    @abstractmethod
    async def get_user_playlists_by_sourse(
        self, session: AsyncSession, owner_id: UUID, platform_user_id: str, source: TrackSource
    ) -> list[PlaylistSchema]: ...

    @abstractmethod
    async def create_with_settings(self, session: AsyncSession, data: PlaylistCreate) -> PlaylistSchema: ...

    @abstractmethod
    async def add_order_to_playlist(
        self, session: AsyncSession, playlist_id: UUID, order: OrderCreate
    ) -> OrderDomain: ...

    @abstractmethod
    async def remove_order_from_playlist(
        self, session: AsyncSession, playlist_id: UUID, order_id: UUID, reason: DeleteStatus
    ): ...

    @abstractmethod
    async def get_play_now(self, session: AsyncSession, playlist_id: UUID) -> OrderDomain | None: ...
