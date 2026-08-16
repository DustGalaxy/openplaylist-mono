from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, Query

from src.database import AsyncSession, get_async_session
from src.dto.moderator import ModeratorAccessInfo
from src.models.auth_user import AuthUserSchema as User
from src.services.auth.auth_service import auth_service
from src.services.notification.notification_service import NotificationService, get_notification_service
from src.services.playlist_log import PlaylistLogService, get_playlist_log_service
from src.services.playlists.basic_service import PlaylistLowService, get_playlist_service, playlist_service
from src.services.playlists.favorite_service import FavoritePlaylistService, get_favorite_playlist_service
from src.services.playlists.moderator_service import ModeratorService, get_moderator_service
from src.services.playlists.order_note_service import OrderNoteService, get_order_note_service
from src.services.playlists.rules_service import RulesService, get_rules_service
from src.services.stream_service import StreamService, get_stream_service

PLST_SERVICE = Annotated[PlaylistLowService, Depends(get_playlist_service)]
RULES_SERVICE = Annotated[RulesService, Depends(get_rules_service)]
FAVORITE_SERVICE = Annotated[FavoritePlaylistService, Depends(get_favorite_playlist_service)]
PLST_LOG_SERVICE = Annotated[PlaylistLogService, Depends(get_playlist_log_service)]
STREAM_SERVICE = Annotated[StreamService, Depends(get_stream_service)]
NOTIFY_SERVICE = Annotated[NotificationService, Depends(get_notification_service)]
MODERATOR_SERVICE = Annotated[ModeratorService, Depends(get_moderator_service)]
ORDER_NOTE_SERVICE = Annotated[OrderNoteService, Depends(get_order_note_service)]

DB_SESSION = Annotated[AsyncSession, Depends(get_async_session)]
CURR_USER = Annotated[User, Depends(auth_service.get_current_user)]
USER_ID = Annotated[UUID, Depends(auth_service.get_current_user_id)]
USER_ID_OR_NONE = Annotated[UUID | None, Depends(auth_service.get_current_user_id_or_none)]


async def beb(db_session: DB_SESSION, playlist_id: UUID, user_id: USER_ID):
    return await playlist_service.is_your_playlist_id(db_session, playlist_id, user_id)


PLST_ID = Annotated[UUID | None, Depends(beb)]


async def get_playlist_moderator_access(
    db_session: DB_SESSION,
    playlist_id: UUID,
    user_id: USER_ID_OR_NONE = None,
    token: str | None = Query(None),
    x_moderator_token: str | None = Header(None, alias="X-Moderator-Token"),
    mod_service: ModeratorService = Depends(get_moderator_service),
) -> ModeratorAccessInfo:
    token_to_use = token or x_moderator_token
    return await mod_service.get_access_info(db_session, playlist_id, user_id=user_id, token=token_to_use)


MODERATOR_ACCESS = Annotated[ModeratorAccessInfo, Depends(get_playlist_moderator_access)]

