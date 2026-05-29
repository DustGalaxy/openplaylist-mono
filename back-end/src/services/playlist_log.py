from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from services.sio_service import sio_service
from models.playlist_logs import PlaylistLogSchema, PlaylistLogCreate
from dal.postgres.playlist_logs import get_playlist_logs_repository

from _types import PlaylistLogsEventTypes


class PlaylistLogService:
    async def log_and_emit(
        self,
        session: AsyncSession,
        user_id: UUID,
        playlist_id: UUID,
        event_type: PlaylistLogsEventTypes,
        event_data: dict,
    ):

        await sio_service.log(
            await get_playlist_logs_repository().create(
                session,
                PlaylistLogCreate(
                    user_id=user_id, playlist_id=playlist_id, event_type=event_type, event_data=event_data
                ),
            )
        )


playlist_log_service = PlaylistLogService()
