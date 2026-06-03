from typing import Union

from src.dto.order import WebNewOrder, TTVNewOrder, YTNewOrder, DANewOrder
from src.services.order_service import order_service
from src.taskiq_broker import task_broker as taskiq_broker
from src.utils import kick, conditional_trace


@conditional_trace("order-flow:step-1")
@taskiq_broker.task(task_name="order.new")
async def order_new(
    order: Union[WebNewOrder, TTVNewOrder, YTNewOrder, DANewOrder],
    is_owner: bool,
):
    from_owner = True if is_owner else False
    new_order = await order_service.init_order(order, from_owner)

    await kick(
        "order.created",
        taskiq_broker,
        new_order,
    )
    return new_order
