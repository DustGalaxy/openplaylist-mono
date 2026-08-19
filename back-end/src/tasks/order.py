
from src.dto.order import DANewOrder, TTVNewOrder, WebNewOrder, YTNewOrder
from src.services.order_service import order_service
from src.utils import conditional_trace, kick
from taskiq_broker import task_broker as taskiq_broker


@conditional_trace("order-flow:step-1")
@taskiq_broker.task(task_name="order.new")
async def order_new(
    order: WebNewOrder | TTVNewOrder | YTNewOrder | DANewOrder,
    is_owner: bool,
):
    from_owner = True if is_owner else False
    print("from_owner", from_owner)
    new_order = await order_service.init_order(order, from_owner)

    await kick(
        "order.created",
        taskiq_broker,
        new_order,
    )
    return new_order
