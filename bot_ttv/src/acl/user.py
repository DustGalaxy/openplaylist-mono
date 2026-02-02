import json

from src.log_setup import LOGGER
from src.adapters._rabbit.dto.user import TTVUser
from src.adapters._rabbit.handlers import main_exchange, broker


async def get_users():
    LOGGER.info("Попытка получить список пользователей...")
    raw_users = await broker.request(queue="auth.user.twitch.all.request", exchange=main_exchange)

    users = [TTVUser.model_validate(user) for user in json.loads(raw_users.body) if raw_users.body]

    return users
