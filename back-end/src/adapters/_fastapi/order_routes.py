from fastapi import APIRouter, status

from dto.order import WebNewOrder

from utils import kick
from taskiq_broker import broker as taskiq_broker
from .dependencies import CURR_USER

router = APIRouter(prefix="/order")


@router.post(
    "/new",
    status_code=status.HTTP_201_CREATED,
)
async def new_order(
    order: WebNewOrder,
    current_user: CURR_USER,
):
    is_owner = order.owner_id == current_user.id
    await kick("order.new", taskiq_broker, order, is_owner, labels={"user_id": str(current_user.id)})
    