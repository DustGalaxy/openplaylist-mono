import logging

from faststream.rabbit import RabbitRouter

from src.adapters._rabbit.broker import (
    bot_da_connect_request,
    bot_da_disconnect,
    main_exchange,
)
from src.adapters._rabbit.dto import ConnectionData
from src.context import context
from src.utils import find

logger = logging.getLogger(__name__)
router = RabbitRouter()


@router.subscriber(bot_da_connect_request, main_exchange)
async def add_connection(
    msg: ConnectionData,
) -> bool:
    logger.info(f"Received connect command for platform_user_id='{msg.platform_user_id}' (user_id={msg.user_id})")
    try:
        if context.manager is None:
            logger.error("Manager is not initialized in application context")
            return False

        await context.manager.add_connection(msg)
        logger.info(f"Successfully connected stream for platform_user_id='{msg.platform_user_id}'")
        return True
    except Exception as e:
        logger.error(
            f"Failed to add connection for platform_user_id='{msg.platform_user_id}': {e}",
            exc_info=True,
        )
        return False


@router.subscriber(bot_da_disconnect, exchange=main_exchange)
async def disconnect_from_da(msg: str) -> bool:
    platform_user_id = str(msg).strip('"')
    logger.info(f"Received disconnect command for platform_user_id='{platform_user_id}'")
    try:
        if context.manager is None:
            logger.error("Manager is not initialized in application context")
            return False

        listener = find(context.manager.connections, lambda conn: conn.platform_user_id == platform_user_id)
        if not listener:
            logger.info(f"Listener for platform_user_id='{platform_user_id}' was not active, nothing to disconnect")
            return True

        await context.manager.stop_connection(listener)
        logger.info(f"Successfully disconnected stream for platform_user_id='{platform_user_id}'")
        return True
    except Exception as e:
        logger.error(
            f"Failed to disconnect stream for platform_user_id='{platform_user_id}': {e}",
            exc_info=True,
        )
        return False
