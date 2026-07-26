from fastapi import APIRouter, HTTPException, status

from src.adapters._fastapi.dependencies import CURR_USER
from src.adapters._rabbit.broker import get_broker
from src.adapters._rabbit.queues import main_exchange
from src.dto.order import NewOrderPayload, WebNewOrder

router = APIRouter(prefix="/order")


@router.post(
    "/new",
    status_code=status.HTTP_201_CREATED,
)
async def new_order(
    order: WebNewOrder,
    current_user: CURR_USER,
):
    if "custom-" in order.priority and order.owner_id != current_user.id:
        raise HTTPException(400)

    await get_broker().publish(
        NewOrderPayload(order=order, from_owner=order.owner_id == current_user.id), "order.proccess", main_exchange
    )
    # await kick("order.new", taskiq_broker, order, is_owner, labels={"user_id": str(current_user.id)})
