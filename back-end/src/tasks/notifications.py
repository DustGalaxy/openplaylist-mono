from logging import getLogger
from uuid import UUID

from src._types import PlaylistEventType
from src.dal._redis.broker import get_broker
from src.database import async_session_maker
from src.models.notification import EventNotificationCreate
from src.services.notification.notification_service import _notification_service
from src.utils import get_event_payload_type
from taskiq_broker import task_broker as taskiq_broker

logger = getLogger(__name__)


@taskiq_broker.task(task_name="notifications.event.collapse")
async def test(target_key: str):
    redis = get_broker()
    pipe = redis.pipeline()
    pipe.hgetall(target_key)
    pipe.delete(target_key)
    results = pipe.execute()

    data: dict = results[0]  # Получаем dict: {b"counter": b"5", b"payloads": b"[...]"}
    if not data:
        return  # Если ключ уже был обработан или пуст

    # Разбираем ключ обратно на составляющие
    # "stack_event:playlist:123-uuid:track.added" -> ["stack_event", "playlist", "123-uuid", "track.added"]
    _, target_type, target_id, event_type = target_key.split(":")

    event_type = PlaylistEventType(event_type)
    payload = get_event_payload_type(target_type, event_type)  # type: ignore

    async with async_session_maker() as session:
        await _notification_service.create_event_notification(
            session,
            EventNotificationCreate(
                target_id=UUID(target_id),
                target_type=target_type,
                event_type=event_type,
                event_data=payload.model_validate(data),
            ),
        )
