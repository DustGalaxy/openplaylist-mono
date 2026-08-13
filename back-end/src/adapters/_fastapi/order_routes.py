from fastapi import APIRouter, HTTPException, status

from src.adapters._fastapi.dependencies import USER_ID
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
    user_id: USER_ID,
    start_from_target: bool = False,
):
    is_owner = bool(user_id and order.owner_id == user_id)
    if "custom-" in order.priority and not is_owner:
        raise HTTPException(400)

    should_start_from_target = start_from_target or order.start_from_target

    await get_broker().publish(
        NewOrderPayload(
            order=order,
            from_owner=is_owner,
            start_from_target=should_start_from_target,
        ),
        "order.proccess",
        main_exchange,
    )

    # await kick("order.new", taskiq_broker, order, is_owner, labels={"user_id": str(current_user.id)})
