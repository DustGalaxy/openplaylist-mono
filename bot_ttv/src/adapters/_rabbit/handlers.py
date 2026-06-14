from faststream import Context
from faststream.rabbit.message import RabbitMessage

from src.log_setup import LOGGER
from src.adapters._rabbit.dto.user import Tokens, SettingsConteiner
from src.adapters._rabbit.dto.order import OrderUpdate
from src.adapters._rabbit.broker import (
    broker,
    main_exchange,
    topic_exchange,
    bot_twitch_connect_request,
    bot_twitch_disconnect,
    bot_order_completed,
    bot_order_cancelled,
    bot_order_partially_completed,
    bot_twitch_settings,
)
from src.bot_setup import Bot, context, eventsub


@broker.subscriber(bot_order_completed, exchange=main_exchange)
@broker.subscriber(bot_order_cancelled, exchange=main_exchange)
@broker.subscriber(bot_order_partially_completed, exchange=main_exchange)
async def order_status(message: RabbitMessage = Context()) -> None:
    await message.ack()
    bot: Bot = context["bot"]  # pyright: ignore[reportAssignmentType]
    if bot is None:
        return
    event: OrderUpdate = OrderUpdate.model_validate_json(message.body)
    user = bot.create_partialuser(user_id=event.owner_platform_id)
    await user.send_message(sender=bot.bot_id, message=f"@{event.requester_nickname} {event.details}")


@broker.subscriber(bot_twitch_connect_request, exchange=main_exchange)
async def connect_to_twitch(message: RabbitMessage = Context()):
    await message.ack()
    bot: Bot = context["bot"]  # pyright: ignore[reportAssignmentType]
    if bot is None:
        return False

    event: Tokens = Tokens.model_validate_json(message.body)
    try:
        await bot.add_token(event.access_token, event.refresh_token, event.platform_user_id)
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


@broker.subscriber(bot_twitch_disconnect, exchange=main_exchange)
async def disconnect_from_twitch(msg: str) -> bool:
    bot: Bot = context["bot"]  # pyright: ignore[reportAssignmentType]
    if bot is None:
        return True

    platform_user_id: str = msg
    try:
        await bot.remove_token(platform_user_id)

        return True
    except Exception as e:
        return False


@broker.subscriber(bot_twitch_settings, exchange=main_exchange)
async def settings(msg: SettingsConteiner):
    bot: Bot = context["bot"]  # pyright: ignore[reportAssignmentType]
    if bot is None:
        return

    bot.prefixes[msg.platform_user_id] = msg.settings.prefix


@broker.subscriber("auth.token.refreshed.twitch", exchange=topic_exchange)
async def tokens_refreshed(message: RabbitMessage = Context()) -> None:
    await message.ack()
    bot: Bot = context["bot"]  # pyright: ignore[reportAssignmentType]
    if bot is None:
        return

    event: Tokens = Tokens.model_validate_json(message.body)

    await bot.add_token(event.access_token, event.refresh_token, event.platform_user_id)
