from fastapi import APIRouter, Depends, status

from dto.order import OrderNew
from dto.user import UserDTO
from services.auth_service import auth_service

from utils import kick
from taskiq_broker import broker as taskiq_broker

router = APIRouter(prefix="/order")


@router.post(
    "/new",
    status_code=status.HTTP_201_CREATED,
)
async def new_order(
    order: OrderNew,
    current_user: UserDTO = Depends(auth_service.get_current_user),
):
    await kick("order.new", taskiq_broker, order, labels={"user_id": str(current_user.id)})
