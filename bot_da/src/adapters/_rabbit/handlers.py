from faststream.rabbit import RabbitMessage

from adapters._rabbit.broker import rabbit_broker, main_exchange, bot_da_connect_request
from adapters._rabbit.dto import ConnectionData
from context import context


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
