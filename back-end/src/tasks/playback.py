from uuid import UUID

from src.dto.playback import Pause, Seek
from src.services.realtime.sio_playlist import sio_playlist_service
from src.services.realtime.sio_widget import sio_widget_service
from taskiq_broker import task_broker as taskiq_broker


@taskiq_broker.task(task_name="playback.pause")
async def playback_pause_handler(playlist_id: UUID, user_id: UUID, state: Pause):
    await sio_playlist_service.pause(playlist_id, state)
    await sio_widget_service.pause(user_id, state)


@taskiq_broker.task(task_name="playback.seek")
async def playback_seek_handler(playlist_id: UUID, user_id: UUID, state: Seek):
    await sio_playlist_service.seek(playlist_id, state)
    await sio_widget_service.seek(user_id, state)
