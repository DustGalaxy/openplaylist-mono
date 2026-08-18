from uuid import UUID, uuid4

from faststream.rabbit import RabbitRouter

from src.adapters._rabbit.broker import main_publisher
from src.adapters._rabbit.queues import (
    bot_order_cancelled,
    bot_order_completed,
    main_exchange,
    playlist_fanout_exchange,
)
from src.dal.postgres.user import user_repository
from src.database import async_session_maker
from src.dto.internal.domain_events import EventOperator, InternalPlaylistEvent, InternalPlaylistEventType
from src.dto.order import NewOrderPayload, OrderUpdate
from src.services.order_service import order_service
from src.services.playlist_service import add_to_playlist_batch

router = RabbitRouter()


def _parse_uuid(val: str | UUID | None) -> UUID | None:
    if isinstance(val, UUID):
        return val
    if isinstance(val, str):
        try:
            return UUID(val)
        except ValueError:
            return None
    return None


@router.subscriber("order.proccess", main_exchange)
async def _(
    payload: NewOrderPayload,
):
    try:
        typed_orders = await order_service.init_orders(
            payload.order, payload.from_owner, start_from_target=payload.start_from_target
        )
    except Exception as exc:
        reward_id = getattr(payload.order, "reward_id", None)
        redemption_id = getattr(payload.order, "redemption_id", None)
        owner_platform_id = getattr(payload.order, "owner_platform_id", None)
        owner_id = getattr(payload.order, "owner_id", None)
        requester_nickname = getattr(payload.order, "requester_nickname", "anonymous")

        if owner_id:
            await main_publisher.publish(
                OrderUpdate(
                    order_id=getattr(payload.order, "request_id", uuid4()),
                    owner_id=owner_id,
                    owner_platform_id=str(owner_platform_id) if owner_platform_id else None,
                    requester_nickname=requester_nickname,
                    status="cancelled",
                    priority=getattr(payload.order, "priority", "points"),
                    details=f"Заказ отменен: {str(exc)}",
                    reward_id=reward_id,
                    redemption_id=redemption_id,
                ),
                bot_order_cancelled,
                main_exchange,
            )
        return

    if not typed_orders:
        return

    first_order = typed_orders[0]

    async with async_session_maker() as db_session:
        owner = await user_repository.get_one(db_session, first_order.owner_id)
        tracks, errors = await add_to_playlist_batch(db_session, typed_orders, owner, payload.from_owner)

    for track, playlist in tracks:
        op_user_id = owner.id if track.from_owner else _parse_uuid(getattr(track, "requester_id", None))
        op_access = "owner" if track.from_owner else "none"
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
                operator=EventOperator(user_id=op_user_id, nickname=track.requester_nickname, access_level=op_access),
                track=track,
            ),
            exchange=playlist_fanout_exchange,
        )

        reward_id = getattr(track.extra_data, "reward_id", None)
        redemption_id = getattr(track.extra_data, "redemption_id", None)
        owner_platform_id = getattr(first_order, "owner_platform_id", None)

        await main_publisher.publish(
            OrderUpdate(
                order_id=track.id,
                owner_id=owner.id,
                owner_platform_id=str(owner_platform_id) if owner_platform_id else None,
                requester_nickname=track.requester_nickname,
                playlist_name=playlist.name,
                status="completed",
                priority=track.priority,
                details=f"Трек '{track.title}' добавлен в плейлист '{playlist.name}'",
                reward_id=reward_id,
                redemption_id=redemption_id,
            ),
            bot_order_completed,
            main_exchange,
        )

    for error_list, playlist in errors:
        op_user_id = owner.id if first_order.from_owner else _parse_uuid(getattr(first_order, "requester_id", None))
        op_access = "owner" if first_order.from_owner else "none"
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
                operator=EventOperator(user_id=op_user_id, nickname=first_order.requester_nickname, access_level=op_access),
                track=first_order,
                error_list=error_list,
            ),
            exchange=playlist_fanout_exchange,
        )

        reward_id = getattr(first_order.extra_data, "reward_id", None)
        redemption_id = getattr(first_order.extra_data, "redemption_id", None)
        owner_platform_id = getattr(first_order, "owner_platform_id", None)
        error_text = ", ".join(error_list) if error_list else "Ошибка добавления трека"

        await main_publisher.publish(
            OrderUpdate(
                order_id=first_order.request_id,
                owner_id=owner.id,
                owner_platform_id=str(owner_platform_id) if owner_platform_id else None,
                requester_nickname=first_order.requester_nickname,
                playlist_name=playlist.name,
                status="cancelled",
                priority=first_order.priority,
                details=f"Заказ отменен: {error_text}",
                reward_id=reward_id,
                redemption_id=redemption_id,
            ),
            bot_order_cancelled,
            main_exchange,
        )

