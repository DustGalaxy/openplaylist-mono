from datetime import datetime
import json

from faststream import Context
from faststream.rabbit.message import RabbitMessage
from simple_repository.exceptions import NotFoundException

from adapters._rabbit.event_broker import (
    broker,
    main_exchange,
    auth_user_twitch_all_request,
    bot_twitch_order_new,
    bot_twitch_ack_connection,
    auth_user_twitch_tokens_refreshed,
)
from dto.order import TTVNewOrder
from adapters._rabbit.dto import Tokens, TwitchTokenRefreshed
from services.sio_service import sio_service

from services.tokens.token_service import token_service
from dal.postgres_impl import token_vault_repository
from _types import Platform
from database import async_session_maker
from utils import kick



@broker.subscriber(bot_twitch_order_new, exchange=main_exchange)
async def order_new_from_twitch(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: TTVNewOrder = TTVNewOrder.model_validate_json(message.body)

    from taskiq_broker import task_broker as taskiq_broker

    await kick("order.new", taskiq_broker, event, False, labels={"user_id": str(event.owner_id)})


@broker.subscriber(bot_twitch_ack_connection, exchange=main_exchange)
async def ack_twitch_connection(
    message: RabbitMessage = Context(),
):
    await message.ack()
    user_id = message.body.decode()
    await sio_service.ack_bot_connection("twitch", user_id)


@broker.subscriber(auth_user_twitch_all_request, exchange=main_exchange)
async def get_all_twitch_users(
    message: RabbitMessage = Context(),
):
    await message.ack()
    print("get_all_twitch_users")
    async with async_session_maker() as session:
        from services.auth.auth_service import auth_service

        tokens = await auth_service.get_all_tokens(session, Platform.TWITCH)
        return [
            Tokens(
                user_id=str(token.user_id),
                access_token=token.access_token,
                refresh_token=token.refresh_token,
                expires_at=token.expires_at,
                platform=token.platform,
                platform_user_id=token.platform_user_id,
            )
            for token in tokens
        ]


@broker.subscriber(auth_user_twitch_tokens_refreshed, exchange=main_exchange)
async def twitch_refresh_tokens(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: TwitchTokenRefreshed = TwitchTokenRefreshed.model_validate_json(message.body)
    async with async_session_maker() as session:
        try:
            tokens = await token_vault_repository.get_by_id_platform(session, str(event.twitch_id), Platform.TWITCH)
        except NotFoundException:
            # TODO: log
            return

        tokens.access_token = event.access_token
        tokens.refresh_token = event.refresh_token
        tokens.expires_at = event.expires_in + int(datetime.now().timestamp())
        await token_vault_repository.update(session, tokens)


@broker.subscriber("user.token.died", exchange=main_exchange)
async def user_token_died(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: dict = json.loads(message.body)
    async with async_session_maker() as session:
        from services.auth.auth_service import auth_service
        
        await auth_service.bot_was_disconnected(session, event, Platform.TWITCH)
