from uuid import uuid4

from faststream.rabbit import RabbitRouter

from src.adapters._rabbit.queues import main_exchange, fanout_exchange
from src.adapters._rabbit.broker import main_publisher

from src.dto.internal.domain_events import InternalPlaylistEvent, InternalPlaylistEventType
from src.dto.order import NewOrderPayload
from src.services.order_service import order_service
from src.dal.postgres.user import user_repository

from src.database import async_session_maker
from src.services.playlist_service import add_to_playlist

router = RabbitRouter()


@router.subscriber("order.proccess", main_exchange)
async def _(
    payload: NewOrderPayload,
):
    typed_payload = await order_service.init_order(payload.order, payload.from_owner)

    async with async_session_maker() as db_session:
        owner = await user_repository.get_one(db_session, typed_payload.owner_id)
        tracks, errors = await add_to_playlist(db_session, typed_payload, owner, typed_payload.from_owner)

    for track, playlist in tracks:
        await main_publisher.publish(
            InternalPlaylistEvent(
                event_id=uuid4(),
                event_type=InternalPlaylistEventType.TRACK_ADDED,
                playlist_id=playlist.id,
                playlist_name=playlist.name,
                playlist_is_public=playlist.is_public,
                show_in_widget=playlist.show_in_widget,
                user_id=owner.id,
                user_name=owner.username,
                track=track,
            ),
            exchange=fanout_exchange,
        )

    for error_list, playlist in errors:
        await main_publisher.publish(
            InternalPlaylistEvent(
                event_id=uuid4(),
                event_type=InternalPlaylistEventType.TRACK_REJECTED,
                playlist_id=playlist.id,
                playlist_name=playlist.name,
                playlist_is_public=playlist.is_public,
                show_in_widget=playlist.show_in_widget,
                user_id=owner.id,
                user_name=owner.username,
                track=typed_payload,
                error_list=error_list,
            ),
            exchange=fanout_exchange,
        )
