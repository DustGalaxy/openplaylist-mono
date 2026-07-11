from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select

from src.models.auth_user import AuthUserSchema as User
from src.models.settings import SettingsSchema

from src.services_low.settings import get_settings_service, SettingsLowService
from src.services_low.playlist import get_playlist_service, PlaylistLowService
from src.services.playlist_log import get_playlist_log_service, PlaylistLogService
from src.services.stream_service import get_stream_service, StreamService
from src.services.notification.notification_service import get_notification_service, NotificationService
from src.services.auth.auth_service import auth_service
from src.orm.playlist import Playlist
from src.orm.settings import Settings

from src.database import AsyncSession, get_async_session
from src.exceptions import NotAuthorizedException


SETTINGS_SERVICE = Annotated[SettingsLowService, Depends(get_settings_service)]
PLST_SERVICE = Annotated[PlaylistLowService, Depends(get_playlist_service)]
PLST_LOG_SERVICE = Annotated[PlaylistLogService, Depends(get_playlist_log_service)]
STREAM_SERVICE = Annotated[StreamService, Depends(get_stream_service)]
NOTIFY_SERVICE = Annotated[NotificationService, Depends(get_notification_service)]

DB_SESSION = Annotated[AsyncSession, Depends(get_async_session)]
CURR_USER = Annotated[User, Depends(auth_service.get_current_user)]
USER_ID = Annotated[UUID, Depends(auth_service.get_current_user_id)]


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
