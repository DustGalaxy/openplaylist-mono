import json
import logging

from src.adapters._rabbit.broker import auth_user_donatex_all_request, main_exchange, rabbit_broker
from src.adapters._rabbit.dto import ConnectionData

logger = logging.getLogger(__name__)


class UserACL:
    @staticmethod
    async def get_users() -> list[ConnectionData] | None:
        timeouts = (t for t in [5, 10, 10, 10, 30])
        attempt = 1
        while True:
            try:
                timeout = next(timeouts)
                logger.info(
                    f"Requesting DonateX users from backend (queue='{auth_user_donatex_all_request.name}', attempt={attempt}, timeout={timeout}s)..."
                )
                try:
                    raw_users = await rabbit_broker.request(
                        queue=auth_user_donatex_all_request, exchange=main_exchange, timeout=timeout
                    )
                    if not raw_users or not raw_users.body:
                        logger.warning("Backend returned empty response body for DonateX users.")
                        return []

                    parsed_body = json.loads(raw_users.body)
                    users = [ConnectionData.model_validate(user) for user in parsed_body]
                    logger.info(f"Successfully retrieved {len(users)} DonateX user(s) from backend.")
                    return users
                except TimeoutError:
                    logger.warning(f"Timeout ({timeout}s) waiting for DonateX users from backend on attempt {attempt}.")
                    attempt += 1
                except Exception as e:
                    logger.error(f"Error parsing DonateX users from backend response: {e}", exc_info=True)
                    attempt += 1
            except StopIteration:
                logger.error("Exhausted all retry attempts fetching DonateX users from backend.")
                return None
