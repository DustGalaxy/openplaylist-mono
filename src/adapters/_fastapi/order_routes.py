from fastapi import APIRouter, Depends, status
from simple_repository.exceptions import IntegrityConflictException
from fastapi_events.dispatcher import dispatch

from _types import AsyncSession
from exceptions import BadRequestException
from database import get_async_session

from services.order_service import order_service
from services.auth_service import auth_service
from dto.order import OrderNew
from dto.user import UserDTO
from dto.events import OrderCreated

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify if the service is running.
    """
    return {"status": "ok"}


@router.post(
    "/new",
    status_code=status.HTTP_201_CREATED,
)
async def new_order(
    order: OrderNew,
    current_user: UserDTO = Depends(auth_service.get_current_user),
    db_session: AsyncSession = Depends(get_async_session),
):
    new_order = await order_service.init_order(order)
    try:
        new_order = await order_service.create_order(db_session, new_order)

        dispatch(
            OrderCreated(
                order_id=new_order.id,
                owner_id=new_order.owner_id,
                requester_nickname=order.requester_nickname,
                playlist_name=order.playlist_name,
                priority=new_order.priority,
                yt_video_id=new_order.yt_video_id,
                title=new_order.title,
                duration=new_order.duration,
                views=new_order.views,
                likes=new_order.likes,
                source=new_order.source,
                created_at=new_order.created_at,
            )
        )

    except IntegrityConflictException as e:
        print(e)
        raise BadRequestException()
