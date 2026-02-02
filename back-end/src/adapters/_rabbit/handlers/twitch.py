import time

from simple_repository.exceptions import NotFoundException
from faststream import Context
from faststream.rabbit.message import RabbitMessage

from adapters._rabbit.dto import TwitchUser, TwitchTokenRefreshed
from adapters._rabbit.event_broker import (
    broker,
    main_exchange,
    auth_user_twitch_all_request,
    auth_user_twitch_tokens_refreshed,
    bot_twitch_order_new,
    bot_twitch_ack_connection,
)
from dto.order import OrderNew, TTVNewOrder
from services.sio_service import sio_service
from services.auth_service import auth_service
from _types import Platform
from database import async_session_maker
from repo import user_repository, linked_accounts_repository
from utils import find, kick
from taskiq_broker import broker as taskiq_broker


@broker.subscriber(bot_twitch_order_new, exchange=main_exchange)
async def order_new_from_twitch(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: TTVNewOrder = TTVNewOrder.model_validate_json(message.body)
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
    print("get_all_twitch_users event")
    async with async_session_maker() as session:
        users, count = await user_repository.get_all(session)

        users = [user for user in users if any([x.platform == Platform.TWITCH for x in user.linked_accounts])]
        links = [find(user.linked_accounts, lambda x: x.platform == Platform.TWITCH) for user in users]
        return [
            TwitchUser(
                user_id=link.user_id,
                twitch_id=link.platform_user_id,
                access_token=link.access_token,
                refresh_token=link.refresh_token,
                expires_at=link.expires_at,
            )
            for link in links
            if link
        ]


@broker.subscriber(auth_user_twitch_tokens_refreshed, exchange=main_exchange)
async def twitch_refresh_tokens(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: TwitchTokenRefreshed = TwitchTokenRefreshed.model_validate_json(message.body)
    async with async_session_maker() as session:
        try:
            link = await linked_accounts_repository.get_one(session, str(event.twitch_id), column="platform_user_id")
        except NotFoundException:
            # TODO: log
            return
        link.access_token = event.access_token
        link.refresh_token = event.refresh_token
        link.expires_at = event.expires_in + int(time.time())
        await linked_accounts_repository.update(session, link)
