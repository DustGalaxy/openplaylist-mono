from faststream import Context
from faststream.rabbit import RabbitMessage

from adapters._rabbit.broker import rabbit_broker, main_exchange, bot_da_connect_request, auth_user_da_all_request
from adapters._rabbit.dto import LinkedAccountWithTokensRead
from context import context


@rabbit_broker.subscriber(bot_da_connect_request, main_exchange)
async def add_connection(
    message: RabbitMessage,
):
    await message.ack()

    link: LinkedAccountWithTokensRead = LinkedAccountWithTokensRead.model_validate_json(message.body)
    if context.manager is not None:
        await context.manager.add_connection(link)
