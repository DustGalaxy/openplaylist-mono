import json
from adapters._rabbit.dto import DAUser
from adapters._rabbit.broker import auth_user_da_all_request, main_exchange, rabbit_broker


class UserACL:
    @staticmethod
    async def get_users():
        raw_users = await rabbit_broker.request(queue=auth_user_da_all_request, exchange=main_exchange)
        users = [DAUser.model_validate(user) for user in json.loads(raw_users.body) if raw_users.body]

        return users
