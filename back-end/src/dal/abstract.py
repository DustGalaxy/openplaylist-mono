from abc import abstractmethod
from uuid import UUID

from simple_repository.abctract import IAsyncCrud

from sqlalchemy.ext.asyncio import AsyncSession

from models.order import OrderDomain, OrderPatch, OrderCreate
from models.settings import PlaylistSettingsDomain, PlaylistSettingsPatch, PlaylistSettingsCreate
from models.playlist import PlaylistDomain, PlaylistCreate, PlaylistPatch

from orm.order import Order
from orm.playlist import Playlist
from orm.settings import PlaylistSettings


class IOrderRepository(IAsyncCrud[Order, OrderDomain, OrderCreate, OrderPatch]):
    pass


class IPlaylistSettingsRepository(
    IAsyncCrud[PlaylistSettings, PlaylistSettingsDomain, PlaylistSettingsCreate, PlaylistSettingsPatch]
):
    pass


class IPlaylistRepository(IAsyncCrud[Playlist, PlaylistDomain, PlaylistCreate, PlaylistPatch]):
    @abstractmethod
    async def get_active_streamer_playlist(self, session: AsyncSession, owner_id: UUID) -> PlaylistDomain: ...

    @abstractmethod
    async def create_with_settings(
        self,
        session: AsyncSession,
        playlist_data: PlaylistCreate,
    ) -> PlaylistDomain: ...

    @abstractmethod
    async def get_user_playlist_by_name(self, session: AsyncSession, owner_id: UUID, name: str) -> PlaylistDomain: ...

    @abstractmethod
    async def get_by_string(self, session: AsyncSession, query: str) -> list[PlaylistDomain]: ...
