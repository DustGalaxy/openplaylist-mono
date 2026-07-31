from faststream.rabbit import RabbitRouter

from src.adapters._rabbit.queues import (
    playlist_fanout_exchange,
)
from src.dto.events import Deleted, PlayNow
from src.dto.internal.domain_events import InternalPlaylistEvent, InternalPlaylistEventType
from src.models.order import OrderDomain
from src.services.realtime.sio_playlist import sio_playlist_service

router = RabbitRouter()


@router.subscriber("internal.playlist.callback", playlist_fanout_exchange)
async def _(event: InternalPlaylistEvent):
    match event.event_type:
        case InternalPlaylistEventType.TRACK_ADDED:
            if not event.track or not isinstance(event.track, OrderDomain):
                return
            await sio_playlist_service.add_track(event.track, event.playlist_id)

        case InternalPlaylistEventType.TRACK_PLAY:
            if not event.track or not isinstance(event.track, OrderDomain):
                return
            await sio_playlist_service.set_playnow(
                PlayNow(track_id=str(event.track.id), playlist_id=str(event.playlist_id))
            )

        case (
            InternalPlaylistEventType.TRACK_REMOVED
            | InternalPlaylistEventType.TRACK_LISTENED
            | InternalPlaylistEventType.TRACK_SKIPPED
            | InternalPlaylistEventType.TRACK_REPORTED
        ):
            if not event.track or not isinstance(event.track, OrderDomain):
                return
            await sio_playlist_service.delete_track(
                Deleted(track_id=str(event.track.id), playlist_id=str(event.playlist_id))
            )

        case InternalPlaylistEventType.TRACK_REMOVED_BULK:
            if not event.bulk_ids:
                return

            await sio_playlist_service.bulk_delete_tracks(ids=event.bulk_ids, playlist_id=event.playlist_id)

        case InternalPlaylistEventType.PLAYLIST_SETTINGS_CHANGED:
            if not event.playlist_data:
                return
            await sio_playlist_service.settings_changed(event.playlist_data)
