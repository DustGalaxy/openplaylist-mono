from uuid import UUID

from src.dto.events import Deleted, Moved, PlayNow, Private
from src.dto.settings import ReadPlaylistSettings
from src.models.order import OrderDomain
from src.services.realtime.sio_playlist import sio_playlist_service
from src.utils import conditional_trace
from taskiq_broker import task_broker as taskiq_broker


@taskiq_broker.task(task_name="playlist.track.playnow")
async def playlist_track_playnow_handler(event: PlayNow):
    await sio_playlist_service.set_playnow(event)


@conditional_trace("order-flow:step-3")
@taskiq_broker.task(task_name="playlist.track.added")
async def playlist_track_added_handler(payload: OrderDomain, playlist_id: UUID):
    await sio_playlist_service.add_track(payload, playlist_id)
    return True


@taskiq_broker.task(task_name="playlist.track.deleted")
async def playlist_track_deleted_handler(payload: Deleted):
    await sio_playlist_service.delete_track(payload)


@taskiq_broker.task(task_name="playlist.track.move")
async def playlist_track_move_handler(event: Moved):
    await sio_playlist_service.move_track(event)


@taskiq_broker.task(task_name="playlist.privacy.private")
async def playlist_privacy_private_handler(event: Private):
    await sio_playlist_service.set_private(event)


@taskiq_broker.task(task_name="playlist.settings_changed")
async def playlist_settings_changed_handler(event: ReadPlaylistSettings):
    await sio_playlist_service.settings_changed(event)


# # ОДУМАЙСЯ
# @taskiq_broker.task(task_name="playlist.settings.request")
# async def handle_settings_request(
#     event: dict,
# ):
#     event_name, payload = event
#     plst_name = payload["playlist_name"]
#     user_id = payload["user_id"]

#     async with async_session_maker() as db_session:
#         plst = await playlist_service.get_by_name(db_session, user_id, plst_name)
#         settings = await playlist_settings_repository.get_one(db_session, plst.id, column="playlist_id")
#         get_broker().set(f"{user_id}:{plst.name}:settings", settings.model_dump_json())
#         return plst
