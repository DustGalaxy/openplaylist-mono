from faststream import Context
from faststream.rabbit.message import RabbitMessage

from src.log_setup import LOGGER
from src.adapters._rabbit.dto.user import LinkedAccountWithTokensRead
from src.adapters._rabbit.dto.order import OrderUpdate
from src.adapters._rabbit.broker import (
    broker,
    main_exchange,
    bot_twitch_connect_request,
    bot_twitch_disconnect_request,
    bot_order_completed,
    bot_order_cancelled,
    bot_order_partially_completed,
)
from src.bot_setup import Bot, context, eventsub
from src.utils import get_twitch_id


@broker.subscriber(bot_order_completed, exchange=main_exchange)
@broker.subscriber(bot_order_cancelled, exchange=main_exchange)
@broker.subscriber(bot_order_partially_completed, exchange=main_exchange)
async def order_status(message: RabbitMessage = Context()) -> None:
    await message.ack()
    bot: Bot = context["bot"]  # pyright: ignore[reportAssignmentType]
    LOGGER.info(f"ttvbot inst - {bot}")
    if bot is None:
        return
    event: OrderUpdate = OrderUpdate.model_validate_json(message.body)
    ttv_id = await get_twitch_id(str(event.owner_id))
    user = bot.create_partialuser(user_id=ttv_id)
    await user.send_message(sender=bot.bot_id, message=f"@{event.requester_nickname} {event.details}")


@broker.subscriber(bot_twitch_connect_request, exchange=main_exchange)
async def connect_to_twitch(message: RabbitMessage = Context()):
    await message.ack()
    bot: Bot = context["bot"]  # pyright: ignore[reportAssignmentType]
    LOGGER.info(f"ttvbot inst - {bot}")
    if bot is None:
        return False

    event: LinkedAccountWithTokensRead = LinkedAccountWithTokensRead.model_validate_json(message.body)
    try:
        await bot.multi_subscribe(
            [
                eventsub.ChatMessageSubscription(
                    broadcaster_user_id=event.platform_user_id,
                    user_id=bot.bot_id,
                )
            ]
        )

        await bot.add_token(event.access_token, event.refresh_token, event.platform_user_id)
        return True
    except Exception as e:
        LOGGER.error(e)
        return False


@broker.subscriber(bot_twitch_disconnect_request, exchange=main_exchange)
async def disconnect_from_twitch(message: RabbitMessage = Context()) -> None:
    await message.ack()
    bot: Bot = context["bot"]  # pyright: ignore[reportAssignmentType]
    LOGGER.info(f"ttvbot inst - {bot}")
    if bot is None:
        return
    event: LinkedAccountWithTokensRead = LinkedAccountWithTokensRead.model_validate_json(message.body)
