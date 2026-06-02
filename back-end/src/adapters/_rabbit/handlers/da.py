from faststream import Context
from faststream.rabbit.message import RabbitMessage


from adapters._rabbit.dto import DATokenRefreshed, DAUser as DAUser_Rabbit
from adapters._rabbit.event_broker import (
    broker,
    main_exchange,
    auth_user_da_all_request,
    auth_user_da_tokens_refreshed,
    bot_da_order_new,
    bot_da_ack_connection,
)
from dto.order import DANewOrder
from _types import Platform
from database import async_session_maker
from dal.postgres_impl import user_repository, linked_accounts_repository, token_vault_repository
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
        tokens = await token_vault_repository.get_all_by_platform(session, Platform.DA)

        return [
            DAUser_Rabbit(
                user_id=token.user_id,
                da_id=token.platform_user_id,
                access_token=token.access_token,
                refresh_token=token.refresh_token,
                expires_at=token.expires_at,
            )
            for token in tokens
        ]


@broker.subscriber(auth_user_da_tokens_refreshed, exchange=main_exchange)
async def da_refresh_tokens(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: DATokenRefreshed = DATokenRefreshed.model_validate_json(message.body)
    async with async_session_maker() as session:
        token = await token_vault_repository.get_by_id_platform(session, event.platform_user_id, Platform.DA)

        if not token:
            return
        token.access_token = event.access_token
        token.refresh_token = event.refresh_token
        token.expires_at = event.expires_at
        await token_vault_repository.update(session, token)
       