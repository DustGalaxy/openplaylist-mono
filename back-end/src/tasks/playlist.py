from uuid import UUID

from fastapi.logger import logger

from database import async_session_maker
from taskiq_broker import broker as taskiq_broker
from utils import kick

from adapters._rabbit.event_broker import broker as rabbit_broker
from adapters._rabbit.event_broker import main_exchange
from adapters._redis.broker import redis_adapter
from dto.events import Deleted, Moved, OrderCreated, PlaylistTrackAdded, PlayNow, Private
from dto.order import OrderUpdate
from dto.settings import ReadPlaylistSettings
from services.playlist_service import playlist_service
from services.sio_service import sio_service
from models.order import OrderCreate, OrderDomain

@taskiq_broker.task(task_name="playlist.track.playnow")
async def playlist_track_playnow_handler(event: PlayNow):
    await sio_service.set_playnow(event)


@taskiq_broker.task(task_name="playlist.track.added")
async def playlist_track_added_handler(payload: OrderDomain, playlist_id: UUID):
    await sio_service.add_track(payload, playlist_id)


@taskiq_broker.task(task_name="playlist.track.deleted")
async def playlist_track_deleted_handler(payload: Deleted):
    await sio_service.delete_track(payload)


@taskiq_broker.task(task_name="playlist.track.move")
async def playlist_track_move_handler(event: Moved):
    await sio_service.move_track(event)


@taskiq_broker.task(task_name="playlist.privacy.private")
async def playlist_privacy_private_handler(event: Private):
    await sio_service.set_private(event)


@taskiq_broker.task(task_name="playlist.settings_changed")
async def playlist_settings_changed_handler(event: ReadPlaylistSettings):
    await sio_service.settings_changed(event)


# ОДУМАЙСЯ
@taskiq_broker.task(task_name="playlist.settings.request")
async def handle_settings_request(
    event: dict,
):
    event_name, payload = event
    plst_name = payload["playlist_name"]
    user_id = payload["user_id"]

    async with async_session_maker() as db_session:
        plst = await playlist_service.get_by_name(db_session, user_id, plst_name)
        redis_adapter.set(f"{user_id}:{plst.name}:settings", plst.settings.model_dump_json())
        return plst.settings


@taskiq_broker.task(task_name="order.created")
async def handle_order_created(
    typed_payload: OrderCreate,
):
    
    async with async_session_maker() as db_session:
        tracks, errors = await playlist_service.add_to_playlist(db_session, typed_payload)

    for track, playlist_id in tracks:
        await kick(
            "playlist.track.added",
            taskiq_broker,
            track,
            playlist_id,
        )
    # event_order_update = OrderUpdate(
    #     order_id=typed_payload.order_id,
    #     owner_id=typed_payload.owner_id,
    #     requester_nickname=typed_payload.requester_nickname,
    #     priority=typed_payload.priority,
    #     status="processing",
    #     details="",
    # )
    # try:


            
    #     if errors:
    #         text = ""
    #         for err in errors:
    #             text += f"{err[1]}: {', '.join(err[0])}\n"

    #         event_order_update.status = "partially_completed" if len(tracks) > 0 else "cancelled"
    #         event_order_update.details = text
    #     else:
    #         event_order_update.details = f"{typed_payload.title} added to playlist."
    #         event_order_update.status = "in playlist"

    # except Exception as e:
    #     event_order_update.details = "Failed to add track to playlist due to unexpected error."
    #     event_order_update.status = "cancelled"
    #     logger.error(e)

    # await rabbit_broker.publish(event_order_update, "order.status_update", main_exchange)
    # if typed_payload.source == "twitch":
    #     if event_order_update.status == "cancelled":
    #         await rabbit_broker.publish(event_order_update, "bot.order.cancelled", main_exchange)
    #     elif event_order_update.status == "partially_completed":
    #         await rabbit_broker.publish(event_order_update, "bot.order.partially_completed", main_exchange)
    #     else:
    #         await rabbit_broker.publish(event_order_update, "bot.order.completed", main_exchange)
