from fastapi import APIRouter, status

from src.dto.order import WebNewOrder, NewOrderPayload
from src.adapters._rabbit.broker import get_broker
from src.adapters._rabbit.queues import main_exchange
from src.adapters._fastapi.dependencies import CURR_USER

router = APIRouter(prefix="/order")


@router.post(
    "/new",
    status_code=status.HTTP_201_CREATED,
)
async def new_order(
    order: WebNewOrder,
    current_user: CURR_USER,
):

    await get_broker().publish(
        NewOrderPayload(order=order, from_owner=order.owner_id == current_user.id), "order.proccess", main_exchange
    )
    # await kick("order.new", taskiq_broker, order, is_owner, labels={"user_id": str(current_user.id)})
