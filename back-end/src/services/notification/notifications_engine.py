from typing import Any
from uuid import UUID


from src.dal._redis.broker import RedisAdapter, get_broker
from src.dto.internal.notifications import BaseEvent
from src.delay_task import delay_kick
from taskiq_broker import task_broker
from src.services.notification.notification_service import _notification_service
from src.models.notification import EventNotificationCreate
from src.utils import get_event_payload_type
from src.database import async_session_maker


class NotificationsEngine:
    def __init__(self, redis_client, broker, delay_seconds: int = 60 * 20):
        self.redis: RedisAdapter = redis_client
        self.broker = broker
        self.delay_seconds = delay_seconds


    async def add_event(self, event: BaseEvent, extra_data: dict[str, Any] | None = None):
        key = f"stack_event:{event.target_type}:{event.target_id}:{event.event_type}"
        current_count = self.redis.hincrby(key, "counter", 1)
        if extra_data:
            self.redis.hset(key, mapping=extra_data)

        self.redis.expire(key, self.delay_seconds + 120)

        if current_count == 1:
            await delay_kick(
                "notifications.event.collapse",
                self.broker,
                delay=self.delay_seconds,
                target_key=key,
            )

    async def send_event(self, event: BaseEvent, extra_data: dict[str, Any] | None = None):
        payload = get_event_payload_type(event.target_type, event.event_type)  # type: ignore
        if extra_data:
            payload.update(**extra_data)

        async with async_session_maker() as session:
            await _notification_service.create_event_notification(
                session,
                EventNotificationCreate(
                    target_id=event.target_id,
                    target_type=event.target_type,
                    event_type=event.event_type,
                    event_data=payload,
                ),
            )


notification_engine = NotificationsEngine(get_broker(), task_broker)
