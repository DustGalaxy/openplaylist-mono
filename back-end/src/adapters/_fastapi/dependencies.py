from typing import Annotated
from uuid import UUID

from fastapi import Depends

from src.database import AsyncSession, get_async_session
from src.models.auth_user import AuthUserSchema as User
from src.services.auth.auth_service import auth_service
from src.services.notification.notification_service import NotificationService, get_notification_service
from src.services.playlist_log import PlaylistLogService, get_playlist_log_service
from src.services.playlists.basic_service import PlaylistLowService, get_playlist_service, playlist_service
from src.services.playlists.favorite_service import FavoritePlaylistService, get_favorite_playlist_service
from src.services.playlists.rules_service import RulesService, get_rules_service
from src.services.stream_service import StreamService, get_stream_service

PLST_SERVICE = Annotated[PlaylistLowService, Depends(get_playlist_service)]
RULES_SERVICE = Annotated[RulesService, Depends(get_rules_service)]
FAVORITE_SERVICE = Annotated[FavoritePlaylistService, Depends(get_favorite_playlist_service)]
PLST_LOG_SERVICE = Annotated[PlaylistLogService, Depends(get_playlist_log_service)]
STREAM_SERVICE = Annotated[StreamService, Depends(get_stream_service)]
NOTIFY_SERVICE = Annotated[NotificationService, Depends(get_notification_service)]

DB_SESSION = Annotated[AsyncSession, Depends(get_async_session)]
CURR_USER = Annotated[User, Depends(auth_service.get_current_user)]
USER_ID = Annotated[UUID, Depends(auth_service.get_current_user_id)]
USER_ID_OR_NONE = Annotated[UUID | None, Depends(auth_service.get_current_user_id_or_none)]


async def beb(db_session: DB_SESSION, playlist_id: UUID, user_id: USER_ID):
    return await playlist_service.is_your_playlist_id(db_session, playlist_id, user_id)


PLST_ID = Annotated[UUID | None, Depends(beb)]
