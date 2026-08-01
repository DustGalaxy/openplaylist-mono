from faststream.rabbit import RabbitRouter
from src.adapters._rabbit.broker import (
    auth_user_donatex_all_request,
    auth_user_donatex_tokens_refreshed,
    bot_donatex_connect_request,
    bot_donatex_disconnect,
    main_exchange,
    user_token_died,
)
from src.adapters._rabbit.dto import ConnectionData
from src.app_context import context
from src.utils import find


router = RabbitRouter()


@router.subscriber(bot_donatex_connect_request, main_exchange)
async def add_connection(
    msg: ConnectionData,
):
    try:
        if context.manager is not None:
            await context.manager.add_connection(msg)
            return True
        return False
    except Exception:
        return False


@router.subscriber(bot_donatex_disconnect, exchange=main_exchange)
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
