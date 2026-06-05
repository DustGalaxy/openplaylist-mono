from services.sio_service import sio_service

from models.playlist_logs import PlaylistLogSchema

from taskiq_broker import task_broker as taskiq_broker


@taskiq_broker.task(task_name="playlist.log")
async def log(log: PlaylistLogSchema):
    await sio_service.log(log)
