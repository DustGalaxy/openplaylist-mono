from datetime import datetime, timedelta, timezone

from taskiq.kicker import AsyncKicker

from taskiq_broker import redis_sourse


async def delay_kick(task_name: str, broker, delay: float, *args, labels=None, **kwargs):
    if labels is None:
        labels = {}
    kicker = AsyncKicker(task_name, broker, labels=labels)
    time = datetime.now(timezone.utc) + timedelta(seconds=delay)
    return await kicker.schedule_by_time(redis_sourse, time, *args, **kwargs)
