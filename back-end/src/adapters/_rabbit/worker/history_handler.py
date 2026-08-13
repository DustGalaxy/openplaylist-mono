from faststream.log import logger
from faststream.rabbit import RabbitRouter

from src.adapters._rabbit.queues import playlist_fanout_exchange
from src.dal.postgres.history import playback_history_repository
from src.database import async_session_maker
from src.dto.internal.domain_events import InternalPlaylistEvent, InternalPlaylistEventType

router = RabbitRouter()


@router.subscriber("internal.playlist.history", playlist_fanout_exchange)
async def history_event_subscriber(event: InternalPlaylistEvent):
    if event.event_type == InternalPlaylistEventType.TRACK_PLAY:
        if not event.track or not getattr(event.track, "id", None):
            return

        async with async_session_maker() as session:
            try:
                await playback_history_repository.upsert_entry(
                    session=session,
                    user_id=event.user_id,
                    order_id=event.track.id,
                    playlist_id=event.playlist_id,
                )
                logger.info(f"Playback history updated for order {event.track.id} user {event.user_id}")
            except Exception as e:
                logger.error(f"Failed to upsert playback history for order {event.track.id}: {e}")
