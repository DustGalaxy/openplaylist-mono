from faststream.rabbit import RabbitRouter

from src._types import NotificationType, PlaylistEventType
from src.adapters._rabbit.queues import playlist_fanout_exchange, user_fanout_exchange
from src.dto.internal.domain_events import (
    InternalPlaylistEvent,
    InternalPlaylistEventType,
    InternalUserEvent,
    InternalUserEventType,
)
from src.dto.internal.notifications import BaseEvent
from src.services.notification.notifications_engine import notification_engine

router = RabbitRouter()


@router.subscriber(queue="internal.playlist.notifications", exchange=playlist_fanout_exchange)
async def _(event: InternalPlaylistEvent):
    if not event.playlist_is_public and event.event_type not in [
        InternalPlaylistEventType.PLAYLIST_CREATED,
        InternalPlaylistEventType.PLAYLIST_DELETED,
    ]:
        return

    match event.event_type:
        case InternalPlaylistEventType.TRACK_ADDED:
            await notification_engine.add_event(
                BaseEvent(target_id=event.playlist_id, target_type="playlist", event_type=PlaylistEventType.TRACK_ADDED),
                extra_data={"playlist_name": event.playlist_name, "owner_name": event.user_name},
            )
        case InternalPlaylistEventType.TRACK_REMOVED:
            await notification_engine.add_event(
                BaseEvent(target_id=event.playlist_id, target_type="playlist", event_type=PlaylistEventType.TRACK_REMOVED),
                extra_data={"playlist_name": event.playlist_name, "owner_name": event.user_name},
            )
        case InternalPlaylistEventType.TRACK_REMOVED_BULK:
            if not event.bulk_ids:
                return

            await notification_engine.send_event(
                BaseEvent(target_id=event.playlist_id, target_type="playlist", event_type=PlaylistEventType.TRACK_REMOVED),
                extra_data={
                    "counter": len(event.bulk_ids),
                    "playlist_name": event.playlist_name,
                    "owner_name": event.user_name,
                },
            )
        case InternalPlaylistEventType.TRACK_ADDED_BULK:
            if not event.bulk_ids:
                return

            await notification_engine.send_event(
                BaseEvent(target_id=event.playlist_id, target_type="playlist", event_type=PlaylistEventType.TRACK_ADDED),
                extra_data={
                    "counter": len(event.bulk_ids),
                    "playlist_name": event.playlist_name,
                    "owner_name": event.user_name,
                },
            )


@router.subscriber(queue="internal.user.notifications", exchange=user_fanout_exchange)
async def user_notifications_handler(event: InternalUserEvent):
    match event.event_type:
        case InternalUserEventType.INTEGRATION_DIED:
            await notification_engine.send_notification(
                event.user_id, NotificationType.INTEGRATION_DIED, {"platform": event.died_integration}
            )
