import json
from src.adapters._rabbit.dto.user import TTVUser

from src.adapters._rabbit.handlers import main_exchange, broker


async def get_users():
    print("Попытка получить список пользователей...")
    raw_users = await broker.request("", "auth.user.twitch.all.request", exchange=main_exchange)

    users = [TTVUser.model_validate(user) for user in json.loads(raw_users.body) if raw_users.body]

    return users
