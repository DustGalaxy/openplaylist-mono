from typing import Union

from dto.order import WebNewOrder, TTVNewOrder, YTNewOrder, DANewOrder
from services.order_service import order_service
from taskiq_broker import broker as taskiq_broker
from utils import kick


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
