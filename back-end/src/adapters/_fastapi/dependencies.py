from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select

from models.auth_user import AuthUserSchema as User
from models.settings import SettingsSchema

from services_low.settings import get_settings_service, SettingsLowService
from services_low.playlist import get_playlist_service, PlaylistLowService
from services.auth_service import auth_service
from orm.playlist import Playlist
from orm.settings import Settings

from database import AsyncSession, get_async_session
from exceptions import NotAuthorizedException


DB_SESSION = Annotated[AsyncSession, Depends(get_async_session)]
SETTINGS_SERVICE = Annotated[SettingsLowService, Depends(get_settings_service)]
PLST_SERVICE = Annotated[PlaylistLowService, Depends(get_playlist_service)]
CURR_USER = Annotated[User, Depends(auth_service.get_current_user)]


async def get_current_settings(playlist_id: UUID, current_user: CURR_USER, session: DB_SESSION):
    stmt = (
        select(Settings)
        .join(Playlist, Settings.playlist_id == Playlist.id)
        .where(Settings.playlist_id == playlist_id, Playlist.owner_id == current_user.id)
    )
    result = await session.execute(stmt)
    settings = result.scalar()
    if not settings:
        raise NotAuthorizedException

    return SettingsSchema.model_validate(settings)


SETTINGS = Annotated[SettingsSchema, Depends(get_current_settings)]
