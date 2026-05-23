from faststream import Context
from faststream.rabbit.message import RabbitMessage


from adapters._rabbit.dto import DATokenRefreshed, DAUser as DAUser_Rabbit
from adapters._rabbit.event_broker import (
    broker,
    main_exchange,
    auth_user_da_all_request,
    auth_user_da_tokens_refreshed,
    bot_da_order_new,
    bot_da_ack_connection
)
from dto.order import DANewOrder
from _types import Platform
from database import async_session_maker
from dal.postgres_impl import user_repository, linked_accounts_repository
from services.sio_service import sio_service

from utils import find, kick


@broker.subscriber(bot_da_order_new, exchange=main_exchange)
async def order_new_from_da(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: DANewOrder = DANewOrder.model_validate_json(message.body)

    from taskiq_broker import task_broker as taskiq_broker
    await kick("order.new", taskiq_broker, event, False, labels={"user_id": str(event.owner_id)})

@broker.subscriber(bot_da_ack_connection, exchange=main_exchange)
async def ack_da_connection(
    message: RabbitMessage = Context(),
):
    await message.ack()
    user_id = message.body.decode()
    await sio_service.ack_bot_connection("da", user_id)

@broker.subscriber(auth_user_da_all_request, exchange=main_exchange)
async def get_all_da_users(
    message: RabbitMessage = Context(),
):
    await message.ack()

    async with async_session_maker() as session:
        users, count = await user_repository.get_all(session)

        users = [user for user in users if any([x.platform == Platform.DA for x in user.linked_accounts])]
        links = [find(user.linked_accounts, lambda x: x.platform == Platform.DA) for user in users]
        return [
            DAUser_Rabbit(
                user_id=link.user_id,
                da_id=link.platform_user_id,
                access_token=link.access_token,
                refresh_token=link.refresh_token,
                expires_at=link.expires_at,
            )
            for link in links
            if link
        ]


@broker.subscriber(auth_user_da_tokens_refreshed, exchange=main_exchange)
async def da_refresh_tokens(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: DATokenRefreshed = DATokenRefreshed.model_validate_json(message.body)
    async with async_session_maker() as session:
        user = await user_repository.get_one(session, event.user_id, column="id")
        link = find(user.linked_accounts, lambda x: x.platform == Platform.DA)
        if not link:
            return
        link.access_token = event.access_token
        link.refresh_token = event.refresh_token
        link.expires_at = event.expires_at
        await linked_accounts_repository.update(session, link)
