import json

from src.log_setup import LOGGER
from src.adapters._rabbit.dto.user import Tokens
from src.adapters._rabbit.bots import main_exchange, broker


async def get_users():
    LOGGER.info("Попытка получить список пользователей...")
    raw_users = await broker.request(queue="auth.user.twitch.all.request", exchange=main_exchange)
    dict_users = json.loads(raw_users.body)
    users = [Tokens.model_validate(user) for user in dict_users]

    return users
