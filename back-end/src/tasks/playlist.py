from fastapi.logger import logger

from database import async_session_maker
from taskiq_broker import broker as taskiq_broker
from utils import kick
from exceptions import (
    BlackListTrack,
    BlackListUser,
    NotActivePlaylist,
    NotEnoughLikes,
    NotEnoughViews,
    PlaylistIsFullException,
    TooLong,
    TrackAddException,
    TrackCooldownException,
    UserCooldownException,
    WrongCurrencyAmount,
)
from adapters._rabbit.event_broker import broker as rabbit_broker
from adapters._rabbit.event_broker import main_exchange
from adapters._redis.broker import redis_adapter
from dto.events import Deleted, Moved, OrderCreated, PlaylistTrackAdded, PlayNow, Private
from dto.order import OrderUpdate
from dto.settings import ReadPlaylistSettings
from services.playlist_service import playlist_service
from services.sio_service import sio_service


@taskiq_broker.task(task_name="playlist.track.playnow")
async def playlist_track_playnow_handler(event: PlayNow):
    await sio_service.set_playnow(event)


@taskiq_broker.task(task_name="playlist.track.added")
async def playlist_track_added_handler(payload: PlaylistTrackAdded):
    await sio_service.add_track(payload)


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
    typed_payload: OrderCreated,
):
    event_order_update = OrderUpdate(
        order_id=typed_payload.order_id,
        owner_id=typed_payload.owner_id,
        requester_nickname=typed_payload.requester_nickname,
        priority=typed_payload.priority,
        status="processing",
        details="",
    )
    try:
        async with async_session_maker() as db_session:
            track = await playlist_service.add_to_playlist(db_session, typed_payload)

        event_order_update.details = f"{track['title']} added to playlist."
        event_order_update.status = "completed"

        await kick("playlist.track.added", taskiq_broker, PlaylistTrackAdded.model_validate(track))

    except TrackAddException as e:
        event_order_update.status = "cancelled"

        match e:
            case NotEnoughLikes():
                event_order_update.details = "Not enough likes."
            case NotEnoughViews():
                event_order_update.details = "Not enough views."
            case NotActivePlaylist():
                event_order_update.details = "Playlist is not active."
            case BlackListTrack():
                event_order_update.details = "Track is blacklisted."
            case BlackListUser():
                event_order_update.details = "User is blacklisted."
            case TooLong():
                event_order_update.details = "Track is too long."
            case WrongCurrencyAmount():
                event_order_update.details = "Wrong currency amount."
            case PlaylistIsFullException():
                event_order_update.details = "Playlist is full."
            case TrackCooldownException():
                event_order_update.details = "Track is on cooldown."
            case UserCooldownException():
                event_order_update.details = "User is on cooldown."

    except Exception as e:
        event_order_update.details = "Failed to add track to playlist due to unexpected error."
        event_order_update.status = "cancelled"
        logger.error(e)

    await rabbit_broker.publish(event_order_update, "order.status_update", main_exchange)
    if typed_payload.source == "twitch":
        if event_order_update.status == "cancelled":
            await rabbit_broker.publish(event_order_update, "bot.order.cancelled", main_exchange)
        else:
            await rabbit_broker.publish(event_order_update, "bot.order.completed", main_exchange)
