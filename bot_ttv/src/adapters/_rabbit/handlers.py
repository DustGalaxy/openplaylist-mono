import json

from faststream import Context
from faststream.rabbit import RabbitRouter
from faststream.rabbit.message import RabbitMessage
from src.adapters._rabbit.broker import (
    bot_order_cancelled,
    bot_order_completed,
    bot_order_partially_completed,
    bot_twitch_connect_request,
    bot_twitch_disconnect,
    bot_twitch_settings,
    main_exchange,
    topic_exchange,
)
from src.adapters._rabbit.dto.order import OrderUpdate
from src.adapters._rabbit.dto.user import SettingsConteiner, Tokens
from src.bot_setup import Bot, context, eventsub
from src.log_setup import LOGGER

router = RabbitRouter()


@router.subscriber(bot_order_completed, exchange=main_exchange)
@router.subscriber(bot_order_cancelled, exchange=main_exchange)
@router.subscriber(bot_order_partially_completed, exchange=main_exchange)
async def order_status(message: RabbitMessage = Context()) -> None:
    await message.ack()
    bot: Bot = context["bot"]  # ty:ignore[invalid-assignment]
    if bot is None:
        return
    event: OrderUpdate = OrderUpdate.model_validate_json(message.body)
    user = bot.create_partialuser(user_id=event.owner_platform_id)
    await user.send_message(sender=bot.bot_id, message=f"@{event.requester_nickname} {event.details}")


@router.subscriber(bot_twitch_connect_request, exchange=main_exchange)
async def connect_to_twitch(message: RabbitMessage = Context()):
    await message.ack()
    bot: Bot = context["bot"]  # ty:ignore[invalid-assignment]
    if bot is None:
        return False
    try:
        event: Tokens = Tokens.model_validate_json(message.body)
        await bot.add_token(event.access_token, event.refresh_token, event)
        await bot.multi_subscribe(
            [
                eventsub.ChatMessageSubscription(
                    broadcaster_user_id=event.platform_user_id,
                    user_id=bot.bot_id,
                ),
            ]
        )
        return True
    except Exception as e:
        LOGGER.error(e)
        return False


@router.subscriber(bot_twitch_disconnect, exchange=main_exchange)
async def disconnect_from_twitch(msg: str) -> bool:
    bot: Bot = context["bot"]  # ty:ignore[invalid-assignment]
    if bot is None:
        return True

    platform_user_id: str = msg
    try:
        await bot.remove_token(platform_user_id)

        return True
    except Exception as e:
        return False


@router.subscriber(bot_twitch_settings, exchange=main_exchange)
async def settings(msg: SettingsConteiner):
    bot: Bot = context["bot"]  # ty:ignore[invalid-assignment]
    if bot is None:
        return

    bot.prefixes[msg.platform_user_id] = msg.settings.prefix


@router.subscriber("auth.token.refreshed.twitch", exchange=topic_exchange)
async def tokens_refreshed(message: RabbitMessage = Context()) -> None:
    await message.ack()
    bot: Bot = context["bot"]  # ty:ignore[invalid-assignment]
    if bot is None:
        return

    event: Tokens = Tokens.model_validate_json(message.body)

    await bot.add_token(event.access_token, event.refresh_token, event)
