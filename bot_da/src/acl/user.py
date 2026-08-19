import json
import logging

from src.adapters._rabbit.broker import auth_user_da_all_request, main_exchange, rabbit_broker
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
                    f"Requesting DonationAlerts users from backend (queue='{auth_user_da_all_request.name}', attempt={attempt}, timeout={timeout}s)..."
                )
                try:
                    raw_users = await rabbit_broker.request(
                        queue=auth_user_da_all_request, exchange=main_exchange, timeout=timeout
                    )
                    if not raw_users or not raw_users.body:
                        logger.warning("Backend returned empty response body for DonationAlerts users.")
                        return []

                    parsed_body = json.loads(raw_users.body)
                    users: list[ConnectionData] = []
                    for item in parsed_body:
                        platform_user_id = item.get("da_id") or item.get("platform_user_id")
                        users.append(
                            ConnectionData(
                                user_id=item["user_id"],
                                platform_user_id=str(platform_user_id),
                                access_token=item["access_token"],
                                refresh_token=item.get("refresh_token") or "",
                                expires_at=item.get("expires_at") or 0,
                            )
                        )

                    logger.info(f"Successfully retrieved {len(users)} DonationAlerts user(s) from backend.")
                    return users
                except TimeoutError:
                    logger.warning(f"Timeout ({timeout}s) waiting for DonationAlerts users from backend on attempt {attempt}.")
                    attempt += 1
                except Exception as e:
                    logger.error(f"Error parsing DonationAlerts users response: {e}", exc_info=True)
                    attempt += 1
            except StopIteration:
                logger.error("Exhausted all retry attempts fetching DonationAlerts users from backend.")
                return None
