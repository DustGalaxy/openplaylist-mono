from datetime import datetime
import json

from faststream import Context
from faststream.rabbit.message import RabbitMessage
from simple_repository.exceptions import NotFoundException

from src.adapters._rabbit.event_broker import (
    broker,
    main_exchange,
    auth_user_twitch_all_request,
    bot_twitch_order_new,
    bot_twitch_ack_connection,
    auth_user_twitch_tokens_refreshed,
)
from src.dto.order import TTVNewOrder
from src.adapters._rabbit.dto import Tokens, TwitchTokenRefreshed
from src.services.sio_service import sio_service

from src.services.tokens.token_service import token_service
from src.dal.postgres.token import token_vault_repository
from src.dal.postgres.linked_account import linked_accounts_repository
from src._types import IntegrationPlatform
from src.database import async_session_maker
from src.utils import kick


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
        from src.services.auth.auth_service import auth_service

        tokens = await auth_service.get_all_tokens(session, IntegrationPlatform.TWITCH)
        return [
            Tokens(
                user_id=str(token.linked_account.user_id),
                access_token=token.access_token,
                refresh_token=token.refresh_token,  # type: ignore
                expires_at=token.expires_at,  # type: ignore
                platform=token.linked_account.platform,
                platform_user_id=token.linked_account.platform_user_id,
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
            link = await linked_accounts_repository.get_by_id_platform(
                session, str(event.twitch_id), IntegrationPlatform.TWITCH
            )
        except NotFoundException:
            # TODO: log
            return

        link.tokens.access_token = event.access_token
        link.tokens.refresh_token = event.refresh_token
        link.tokens.expires_at = event.expires_in + int(datetime.now().timestamp())
        await token_vault_repository.update(session, link.tokens)


@broker.subscriber("user.token.died", exchange=main_exchange)
async def user_token_died(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: dict = json.loads(message.body)
    async with async_session_maker() as session:
        from src.services.auth.auth_service import auth_service

        await auth_service.bot_was_disconnected(session, IntegrationPlatform.TWITCH, event["user_id"])
