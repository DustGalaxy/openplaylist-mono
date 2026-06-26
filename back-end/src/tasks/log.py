from src.services.realtime.sio_playlist import sio_playlist_service

from src.models.playlist_logs import PlaylistLogSchema

from taskiq_broker import task_broker as taskiq_broker


@taskiq_broker.task(task_name="playlist.log")
async def log(log: PlaylistLogSchema):
    await sio_playlist_service.log(log)
