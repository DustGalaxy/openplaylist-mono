from faststream.rabbit import RabbitRouter

from src.adapters._rabbit.queues import (
    main_exchange,
    playback_pause_queue,
    playback_seek_queue,
)
from src.dto.playback import PlaybackPauseEvent, PlaybackSeekEvent
from src.services.realtime.sio_playlist import sio_playlist_service
from src.services.realtime.sio_widget import sio_widget_service

router = RabbitRouter()


@router.subscriber(playback_pause_queue, main_exchange)
async def playback_pause_subscriber(event: PlaybackPauseEvent):
    await sio_playlist_service.pause(event.playlist_id, event.state)
    await sio_widget_service.pause(event.user_id, event.state)


@router.subscriber(playback_seek_queue, main_exchange)
async def playback_seek_subscriber(event: PlaybackSeekEvent):
    await sio_playlist_service.seek(event.playlist_id, event.state)
    await sio_widget_service.seek(event.user_id, event.state)

