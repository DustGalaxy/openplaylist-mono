from typing import Any

from faststream.rabbit import RabbitRouter

from src._types import PlaylistLogsEventTypes
from src.adapters._rabbit.queues import (
    playlist_fanout_exchange,
)
from src.database import async_session_maker
from src.dto.internal.domain_events import InternalPlaylistEvent, InternalPlaylistEventType
from src.services.playlist_log import playlist_log_service

router = RabbitRouter()


def _get_operator_payload(event: InternalPlaylistEvent) -> dict[str, Any]:
    if event.operator:
        return {
            "nickname": event.operator.nickname,
            "access_level": event.operator.access_level,
            "user_id": str(event.operator.user_id) if event.operator.user_id else None,
        }
    from_owner = getattr(event.track, "from_owner", False) if event.track else False
    return {
        "nickname": event.user_name
        if from_owner
        else (getattr(event.track, "requester_nickname", None) if event.track else event.user_name),
        "access_level": "owner" if from_owner else "none",
        "user_id": str(event.user_id) if from_owner else None,
    }


@router.subscriber("internal.playlist.log", playlist_fanout_exchange)
async def _(event: InternalPlaylistEvent):
    async with async_session_maker() as db_session:
        op_payload = _get_operator_payload(event)
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
                        "operator": op_payload,
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
                        "operator": op_payload,
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
                        "operator": op_payload,
                    }
                    if event.track
                    else {"title": None, "id": None, "platform": None, "operator": op_payload}
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
                        "operator": op_payload,
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
                        "operator": op_payload,
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
                        "operator": op_payload,
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
                        "operator": op_payload,
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
                        "operator": op_payload,
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
                        "operator": op_payload,
                        "platform": event.track.source,
                        "playlist_name": event.playlist_name,
                        "requester_nickname": event.track.requester_nickname,
                        "reason": PlaylistLogsEventTypes.REPORT_TRACK,
                    },
                )
            case InternalPlaylistEventType.MODERATOR_CLAIMED:
                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.CLAIM_LINK,
                    {
                        "playlist_name": event.playlist_name,
                        "operator": op_payload,
                    },
                )
            case InternalPlaylistEventType.MODERATOR_CLAIM_FAILED:
                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.FAILED_CLAIM_LINK,
                    {
                        "playlist_name": event.playlist_name,
                        "operator": op_payload,
                        "errors": event.error_list or ["Claim failed"],
                    },
                )
            case InternalPlaylistEventType.MODERATOR_LEFT:
                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.MODERATOR_LEAVE,
                    {
                        "playlist_name": event.playlist_name,
                        "operator": op_payload,
                    },
                )
            case InternalPlaylistEventType.MODERATOR_TOKEN_CREATED:
                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.CREATE_MODERATOR_TOKEN,
                    {
                        "playlist_name": event.playlist_name,
                        "operator": op_payload,
                    },
                )
            case InternalPlaylistEventType.MODERATOR_ADDED_DIRECT:
                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.ADD_MODERATOR_DIRECT,
                    {
                        "playlist_name": event.playlist_name,
                        "operator": op_payload,
                    },
                )
            case InternalPlaylistEventType.MODERATOR_REVOKED:
                await playlist_log_service.log_and_emit(
                    db_session,
                    event.user_id,
                    event.playlist_id,
                    PlaylistLogsEventTypes.REVOKE_MODERATOR,
                    {
                        "playlist_name": event.playlist_name,
                        "operator": op_payload,
                    },
                )
