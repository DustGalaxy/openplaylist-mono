from faststream.log import logger
from faststream.rabbit import RabbitRouter

from src._types import PlaylistLogsEventTypes
from src.adapters._rabbit.queues import (
    playlist_fanout_exchange,
)

from src.services.playlist_log import playlist_log_service
from src.database import async_session_maker
from src.dto.internal.domain_events import InternalPlaylistEvent, InternalPlaylistEventType

router = RabbitRouter()


@router.subscriber("internal.playlist.log", playlist_fanout_exchange)
async def _(event: InternalPlaylistEvent):
    async with async_session_maker() as db_session:
        match event.event_type:
            case InternalPlaylistEventType.TRACK_ADDED:
                if not event.track:
                    return

                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.ADD_TRACK,
                    {
                        "title": f"{event.track.title}",
                        "id": f"{event.track.yt_video_id}",
                        "by_owner": event.track.from_owner,
                        "platform": event.track.source,
                    },
                )
            case InternalPlaylistEventType.TRACK_REJECTED:
                if not event.track or not event.error_list:
                    return

                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.ADD_TRACK_ERROR,
                    {
                        "title": f"{event.track.title}",
                        "id": f"{event.track.yt_video_id}",
                        "playlist_name": event.playlist_name,
                        "by_owner": event.track.from_owner,
                        "platform": event.track.source,
                        "errors": event.error_list,
                    },
                )
            case InternalPlaylistEventType.TRACK_PLAY:
                data = (
                    {
                        "title": f"{event.track.title}",
                        "id": f"{event.track.yt_video_id}",
                        "platform": event.track.source,
                        "by_owner": event.track.from_owner,
                    }
                    if event.track
                    else {"title": None, "id": None, "platform": None, "by_owner": None}
                )
                await playlist_log_service.log_and_emit(
                    db_session, event.user_id, event.playlist_id, PlaylistLogsEventTypes.PLAY_TRACK, data
                )
            case InternalPlaylistEventType.TRACK_ADDED_BULK:
                if not event.bulk_ids:
                    return
                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.BULK_ADD_TRACK,
                    {
                        "playlist_name": event.playlist_name,
                        "counter": len(event.bulk_ids),
                    },
                )
            case InternalPlaylistEventType.TRACK_REMOVED:
                if not event.track:
                    return

                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.REMOVE_TRACK,
                    {
                        "id": f"{event.track.yt_video_id}",
                        "title": f"{event.track.title}",
                        "by_owner": event.track.from_owner,
                        "platform": event.track.source,
                        "playlist_name": event.playlist_name,
                        "requester_nickname": event.track.requester_nickname,
                        "reason": PlaylistLogsEventTypes.REMOVE_TRACK,
                    },
                )

            case InternalPlaylistEventType.TRACK_REMOVED_BULK:
                if not event.bulk_ids:
                    return

                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.BULK_REMOVE_TRACK,
                    {
                        "playlist_name": event.playlist_name,
                        "counter": len(event.bulk_ids),
                        "reason": PlaylistLogsEventTypes.REMOVE_TRACK,
                    },
                )
            case InternalPlaylistEventType.TRACK_LISTENED:
                if not event.track:
                    return

                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.LISTEN_TRACK,
                    {
                        "id": f"{event.track.yt_video_id}",
                        "title": f"{event.track.title}",
                        "by_owner": event.track.from_owner,
                        "platform": event.track.source,
                        "playlist_name": event.playlist_name,
                        "requester_nickname": event.track.requester_nickname,
                        "reason": PlaylistLogsEventTypes.LISTEN_TRACK,
                    },
                )
            case InternalPlaylistEventType.TRACK_SKIPPED:
                if not event.track:
                    return

                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.SKIP_TRACK,
                    {
                        "id": f"{event.track.yt_video_id}",
                        "title": f"{event.track.title}",
                        "by_owner": event.track.from_owner,
                        "platform": event.track.source,
                        "playlist_name": event.playlist_name,
                        "requester_nickname": event.track.requester_nickname,
                        "reason": PlaylistLogsEventTypes.SKIP_TRACK,
                    },
                )
            case InternalPlaylistEventType.TRACK_REPORTED:
                if not event.track:
                    return

                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.REPORT_TRACK,
                    {
                        "id": f"{event.track.yt_video_id}",
                        "title": f"{event.track.title}",
                        "by_owner": event.track.from_owner,
                        "platform": event.track.source,
                        "playlist_name": event.playlist_name,
                        "requester_nickname": event.track.requester_nickname,
                        "reason": PlaylistLogsEventTypes.REPORT_TRACK,
                    },
                )
