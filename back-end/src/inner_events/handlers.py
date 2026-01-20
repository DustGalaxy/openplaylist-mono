from fastapi.logger import logger
from fastapi_events.handlers.local import local_handler
from fastapi_events.typing import Event
from fastapi_events.dispatcher import dispatch

from database import async_session_maker
from exceptions import (
    NotEnoughLikes,
    NotEnoughViews,
    NotActivePlaylist,
    BlackListTrack,
    BlackListUser,
    TooLong,
    WrongCurrencyAmount,
    PlaylistIsFullException,
    TrackCooldownException,
    UserCooldownException,
    TrackAddException,
)
from services.sio_service import sio_service
from services.playlist_service import playlist_service
from inner_events.schemas import Added, Deleted, Moved, PlayNow, Private
from dto.settings import ReadPlaylistSettings
from dto.events import OrderCreated
from dto.order import OrderUpdate
from adapters._rabbit.event_broker import broker, main_exchange
from adapters._redis.broker import redis_adapter


@local_handler.register(event_name="playlist.track.playnow")
async def playlist_track_playnow_handler(event: Event):
    event_name, payload = event
    typed_payload = PlayNow.model_validate(payload)

    await sio_service.set_playnow(typed_payload)


@local_handler.register(event_name="playlist.track.added")
async def playlist_track_added_handler(event: Event):
    event_name, payload = event
    typed_payload: Added = Added.model_validate(payload)
    await sio_service.add_track(typed_payload)


@local_handler.register(event_name="playlist.track.deleted")
async def playlist_track_deleted_handler(event: Event):
    event_name, payload = event
    typed_payload: Deleted = Deleted.model_validate(payload)
    await sio_service.delete_track(typed_payload)


@local_handler.register(event_name="playlist.track.move")
async def playlist_track_move_handler(event: Event):
    event_name, payload = event
    typed_payload: Moved = Moved.model_validate(payload)
    await sio_service.move_track(typed_payload)


@local_handler.register(event_name="playlist.privacy.private")
async def playlist_privacy_private_handler(event: Event):
    event_name, payload = event
    typed_payload: Private = Private.model_validate(payload)
    await sio_service.set_private(typed_payload)


@local_handler.register(event_name="playlist.privacy.public")
async def playlist_privacy_public_handler(event: Event): ...


@local_handler.register(event_name="playlist.settings_changed")
async def playlist_settings_changed_handler(event: Event):
    event_name, payload = event
    typed_payload: ReadPlaylistSettings = ReadPlaylistSettings.model_validate(payload)
    await sio_service.settings_changed(typed_payload)


@local_handler.register(event_name="order.created")
async def handle_order_created(
    event: Event,
):
    event_name, payload = event
    typed_payload: OrderCreated = OrderCreated.model_validate(payload)
    print(typed_payload)
    event_order_update = OrderUpdate(
        order_id=typed_payload.order_id,
        owner_id=typed_payload.owner_id,
        requester_nickname=typed_payload.requester_nickname,
        playlist_name=typed_payload.playlist_name,
        priority=typed_payload.priority,
        status="processing",
        details="",
    )
    try:
        async with async_session_maker() as db_session:
            track = await playlist_service.add_to_playlist(db_session, typed_payload)

        event_order_update.details = f"{track['title']} added to playlist."
        event_order_update.status = "completed"

        dispatch(event_name_or_model="playlist.track.added", payload=Added.model_validate(track))

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

    await broker.publish(event_order_update, "order.status_update", main_exchange)
    if typed_payload.source == "twitch":
        if event_order_update.status == "cancelled":
            await broker.publish(event_order_update, "bot.order.cancelled", main_exchange)
        else:
            await broker.publish(event_order_update, "bot.order.completed", main_exchange)


@local_handler.register(event_name="playlist.settings.request")
async def handle_settings_request(
    event: Event,
):
    event_name, payload = event
    plst_name = payload["playlist_name"]
    user_id = payload["user_id"]

    async with async_session_maker() as db_session:
        plst = await playlist_service.get_by_name(db_session, user_id, plst_name)
        redis_adapter.set(f"{user_id}:{plst.name}:settings", plst.settings.model_dump_json())
        return plst.settings
