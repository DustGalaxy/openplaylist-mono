import json
import logging

from src.adapters._rabbit.broker import auth_user_donatex_all_request, main_exchange, rabbit_broker
from src.adapters._rabbit.dto import ConnectionData

logger = logging.getLogger(__name__)


class UserACL:
    @staticmethod
    async def get_users():
        timeouts = (t for t in [5, 10, 10, 10, 30])
        while True:
            try:
                timeout = next(timeouts)
                try:
                    raw_users = await rabbit_broker.request(
                        queue=auth_user_donatex_all_request, exchange=main_exchange, timeout=timeout
                    )
                    users = [ConnectionData.model_validate(user) for user in json.loads(raw_users.body) if raw_users.body]

                    return users
                except TimeoutError:
                    logger.info(f"User fetch attempt fail. Timeout was {timeout}")
            except StopIteration:
                logger.info("Stop fetching.")
                return None
