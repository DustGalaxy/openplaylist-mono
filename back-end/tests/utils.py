import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.adapters._redis.broker import get_broker
else:
    from adapters._redis.broker import get_broker


async def get_last_trace(redis_client, pattern):
    keys = await get_broker().keys(f"trace:{pattern}:*")
    # Берем последний, если их несколько
    key = sorted(keys)[-1]
    return json.loads(await redis_client.get(key))
