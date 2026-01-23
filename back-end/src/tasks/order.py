from typing import Annotated

from taskiq import TaskiqDepends

from _types import AsyncSession
from database import get_async_session
from dto.events import OrderCreated
from dto.order import OrderNew
from services.order_service import order_service
from taskiq_broker import broker as taskiq_broker
from utils import kick


@taskiq_broker.task(task_name="order.new")
async def order_new(
    order: OrderNew,
    is_owner: bool,
    db_session: Annotated[AsyncSession, TaskiqDepends(get_async_session)],
):
    new_order = await order_service.init_order(order)
    new_order = await order_service.create_order(db_session, new_order)

    await kick(
        "order.created",
        taskiq_broker,
        OrderCreated(
            order_id=new_order.id,
            owner_id=new_order.owner_id,
            is_owner=is_owner,
            requester_nickname=order.requester_nickname,
            priority=new_order.priority,
            yt_video_id=new_order.yt_video_id,
            title=new_order.title,
            duration=new_order.duration,
            views=new_order.views,
            likes=new_order.likes,
            source=new_order.source,
            created_at=new_order.created_at,
        ),
    )
