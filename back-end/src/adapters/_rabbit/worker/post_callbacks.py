from faststream.rabbit import RabbitRouter

from src.adapters._rabbit.queues import (
    user_fanout_exchange,
)


from src.dto.internal.domain_events import InternalUserEvent, InternalUserEventType

from src.services.notification.notification_service import get_notification_service

from src.database import async_session_maker

router = RabbitRouter()

@router.subscriber("internal.user.callback", user_fanout_exchange)
async def _(event: InternalUserEvent):
    match event.event_type:
        case InternalUserEventType.USER_CREATED:
            async with async_session_maker() as session:
                await get_notification_service().init_settings(session, event.user_id)