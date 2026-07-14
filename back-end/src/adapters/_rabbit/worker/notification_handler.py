from faststream.rabbit import RabbitRouter

from src._types import PlaylistEventType
from src.adapters._rabbit.queues import (
    fanout_exchange,
)


from src.dto.internal.notifications import BaseEvent
from src.dto.internal.domain_events import InternalPlaylistEvent, InternalPlaylistEventType
from src.services.notification.notifications_engine import notification_engine


router = RabbitRouter()


@router.subscriber("internal.playlist.notifications", fanout_exchange)
async def _(event: InternalPlaylistEvent):
    if not event.playlist_is_public and event.event_type not in [
        InternalPlaylistEventType.PLAYLIST_CREATED,
        InternalPlaylistEventType.PLAYLIST_DELETED,
    ]:
        return

    match event.event_type:
        case InternalPlaylistEventType.TRACK_ADDED:
            await notification_engine.add_event(
                BaseEvent(
                    target_id=event.playlist_id, target_type="playlist", event_type=PlaylistEventType.TRACK_ADDED
                ),
                extra_data={"playlist_name": event.playlist_name, "owner_name": event.user_name},
            )
        case InternalPlaylistEventType.TRACK_REMOVED:
            await notification_engine.add_event(
                BaseEvent(
                    target_id=event.playlist_id, target_type="playlist", event_type=PlaylistEventType.TRACK_REMOVED
                ),
                extra_data={"playlist_name": event.playlist_name, "owner_name": event.user_name},
            )
        case InternalPlaylistEventType.PLAYLIST_RENAMED:
            if (
                not event.renamed_data
                or not event.renamed_data.get("old_name")
                or not event.renamed_data.get("new_name")
            ):
                return

            await notification_engine.send_event(
                BaseEvent(
                    target_id=event.playlist_id, target_type="playlist", event_type=PlaylistEventType.TRACK_REMOVED
                ),
                extra_data={
                    "playlist_name": event.playlist_name,
                    "owner_name": event.user_name,
                    "old_name": event.renamed_data["old_name"],
                    "new_name": event.renamed_data["new_name"],
                },
            )
        case InternalPlaylistEventType.PLAYLIST_VISIABILITY_CHANGED:
            if (
                not event.visiability_data
                or not event.visiability_data.get("before")
                or not event.visiability_data.get("after")
            ):
                return

            await notification_engine.send_event(
                BaseEvent(
                    target_id=event.playlist_id, target_type="playlist", event_type=PlaylistEventType.BASIC_VISIBILITY
                ),
                extra_data={
                    "playlist_name": event.playlist_name,
                    "owner_name": event.user_name,
                    "before": event.visiability_data["before"],
                    "after": event.visiability_data["after"],
                },
            )
        case InternalPlaylistEventType.PLAYLIST_SYNC_CHANGED:
            if not event.sync_data or not event.sync_data.get("before") or not event.sync_data.get("after"):
                return

            await notification_engine.send_event(
                BaseEvent(
                    target_id=event.playlist_id, target_type="playlist", event_type=PlaylistEventType.REALTIME_SYNC
                ),
                extra_data={
                    "playlist_name": event.playlist_name,
                    "owner_name": event.user_name,
                    "before": event.sync_data["before"],
                    "after": event.sync_data["after"],
                },
            )
