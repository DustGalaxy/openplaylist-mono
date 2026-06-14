from faststream.rabbit import RabbitMessage

from adapters._rabbit.broker import (
    rabbit_broker,
    main_exchange,
    bot_da_connect_request,
    auth_user_da_all_request,
    bot_da_disconect,
)
from adapters._rabbit.dto import ConnectionData
from context import context

from utils import find


@rabbit_broker.subscriber(bot_da_connect_request, main_exchange)
async def add_connection(
    message: RabbitMessage,
):
    await message.ack()

    link: ConnectionData = ConnectionData.model_validate_json(message.body)
    if context.manager is not None:
        await context.manager.add_connection(link)
        return True

    return False


@rabbit_broker.subscriber(bot_da_disconect, exchange=main_exchange)
async def disconnect_from_twitch(msg: str) -> bool:
    try:
        if context.manager is not None:
            listner = find(context.manager.connections, lambda conn: conn.platform_user_id == msg)
            if not listner:
                return True
            await context.manager.stop_connection(listner)

        return True
    except Exception as e:
        return False
