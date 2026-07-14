from faststream.rabbit import RabbitRouter

from src.adapters._rabbit.queues import (
    fanout_exchange,
)

from src.services.realtime.sio_widget import sio_widget_service
from src.dto.internal.domain_events import InternalPlaylistEvent, InternalPlaylistEventType

router = RabbitRouter()


@router.subscriber("internal.playlist.widget", fanout_exchange)
async def _(event: InternalPlaylistEvent):
    if not event.show_in_widget:
        return

    match event.event_type:
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

            await sio_widget_service.current_track(data, event.user_id)
