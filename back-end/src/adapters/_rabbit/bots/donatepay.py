import json
from uuid import uuid4

from faststream import Context
from faststream.rabbit import RabbitRouter
from faststream.rabbit.message import RabbitMessage

from src._types import IntegrationPlatform
from src.adapters._rabbit.bots.dto import Tokens
from src.adapters._rabbit.broker import get_broker
from src.adapters._rabbit.queues import (
    auth_user_donatepay_all_request,
    bot_donatepay_order_new,
    main_exchange,
    user_fanout_exchange,
)
from src.database import async_session_maker
from src.dto.internal.domain_events import InternalUserEvent, InternalUserEventType
from src.dto.order import DonatePayNewOrder, NewOrderPayload

router = RabbitRouter()


@router.subscriber(bot_donatepay_order_new, exchange=main_exchange)
async def order_new_from_donatepay(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: DonatePayNewOrder = DonatePayNewOrder.model_validate_json(message.body)

    await get_broker().publish(NewOrderPayload(order=event, from_owner=False), "order.proccess", main_exchange)


@router.subscriber(auth_user_donatepay_all_request, exchange=main_exchange)
async def get_all_donatepay_users(
    message: RabbitMessage = Context(),
):
    await message.ack()
    async with async_session_maker() as session:
        from src.services.auth.auth_service import auth_service

        tokens = await auth_service.get_all_tokens(session, IntegrationPlatform.DONATEPAY)
        return [
            Tokens(
                user_id=str(token.linked_account.user_id),
                access_token=token.access_token,
                refresh_token=token.refresh_token or "",  # type: ignore
                expires_at=token.expires_at or 0,  # type: ignore
                platform=token.linked_account.platform,
                platform_user_id=token.linked_account.platform_user_id,
            )
            for token in tokens
        ]


@router.subscriber("donatepay.user.token.died", exchange=main_exchange)
async def user_token_died(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: dict = json.loads(message.body)
    async with async_session_maker() as session:
        from src.services.auth.auth_service import auth_service

        link = await auth_service.bot_was_disconnected(session, IntegrationPlatform.DONATEPAY, event["platform_user_id"])

        user = await auth_service.user_repo.get_one(session, link.user_id)

        await get_broker().publish(
            InternalUserEvent(
                event_id=uuid4(),
                event_type=InternalUserEventType.INTEGRATION_DIED,
                user_id=user.id,
                user_name=user.username,
                died_integration=IntegrationPlatform.DONATEPAY,
            ),
            exchange=user_fanout_exchange,
        )
