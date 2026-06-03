from uuid import UUID

from src.database import async_session_maker
from taskiq_broker import task_broker as taskiq_broker

from src.adapters._redis.broker import get_broker
from src.dto.events import Deleted, Moved, PlayNow, Private
from src.dto.settings import ReadPlaylistSettings
from src.services.playlist_service import add_to_playlist
from src.services_low.playlist import playlist_service
from src.services.sio_service import sio_service
from src.models.order import OrderCreate, OrderDomain

# from models.playlist_logs import PlaylistLogCreate
# from dal.postgres.playlist_logs import get_playlist_logs_repository as pl_logs

from src.dal.postgres_impl import user_repository, playlist_settings_repository

# from _types import PlaylistLogsEventTypes
from src.utils import kick, conditional_trace


@taskiq_broker.task(task_name="playlist.track.playnow")
async def playlist_track_playnow_handler(event: PlayNow):
    await sio_service.set_playnow(event)


@conditional_trace("order-flow:step-3")
@taskiq_broker.task(task_name="playlist.track.added")
async def playlist_track_added_handler(payload: OrderDomain, playlist_id: UUID):
    await sio_service.add_track(payload, playlist_id)
    return True


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
        settings = await playlist_settings_repository.get_one(db_session, plst.id, column="playlist_id")
        get_broker().set(f"{user_id}:{plst.name}:settings", settings.model_dump_json())
        return plst


@conditional_trace("order-flow:step-2")
@taskiq_broker.task(task_name="order.created")
async def handle_order_created(
    typed_payload: OrderCreate,
):
    async with async_session_maker() as db_session:
        owner = await user_repository.get_one(db_session, typed_payload.owner_id)
        tracks, errors = await add_to_playlist(db_session, typed_payload, owner)

        for track, playlist_id in tracks:
            await kick(
                "playlist.track.added",
                taskiq_broker,
                track,
                playlist_id,
            )

            # await kick(
            #     "playlist.log",
            #     taskiq_broker,
            #     await pl_logs().create(
            #         db_session,
            #         PlaylistLogCreate(
            #             user_id=typed_payload.owner_id,
            #             playlist_id=playlist_id,
            #             event_type=PlaylistLogsEventTypes.ADD_TRACK,
            #             event_data={
            #                 "details": f"Track '{typed_payload.title}' added to playlist",
            #                 "by_owner": typed_payload.from_owner,
            #             },
            #         ),
            #     ),
            # )

        for error_list, playlist_name, playlist_id in errors:
            # await kick(
            #     "playlist.log",
            #     taskiq_broker,
            #     await pl_logs().create(
            #         db_session,
            #         PlaylistLogCreate(
            #             user_id=typed_payload.owner_id,
            #             playlist_id=playlist_id,
            #             event_type=PlaylistLogsEventTypes.ERROR,
            #             event_data={
            #                 "details": f"Failed to add track '{typed_payload.title}' to playlist '{playlist_name}': {'; '.join(error_list)}.",
            #                 "by_owner": typed_payload.from_owner,
            #             },
            #         ),
            #     ),
            # )
            ...

    return tracks, errors
