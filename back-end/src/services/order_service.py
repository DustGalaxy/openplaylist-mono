import re
from uuid import UUID
from pytubefix import YouTube
from sqlalchemy.ext.asyncio import AsyncSession

from _types import Status
from dal.postgres_impl import order_repository
from dal.abstract import IOrderRepository
from dto.order import OrderNew
from models.order import OrderCreate, OrderDomain, OrderPatch


class OrderService:
    def __init__(self, order_repository: IOrderRepository):
        self.order_repository = order_repository

    async def init_order(self, order: OrderNew) -> OrderCreate:
        yt = YouTube("https://www.youtube.com/watch?v=" + order.yt_video_id)
        try:
            first_part = yt.initial_data["contents"]["twoColumnWatchNextResults"]["results"]["results"]["contents"][0]
            second_part = first_part.get("videoPrimaryInfoRenderer") or first_part.get("videoSecondaryInfoRenderer")

            likes = second_part["videoActions"]["menuRenderer"]["topLevelButtons"][0][
                "segmentedLikeDislikeButtonViewModel"
            ]["likeButtonViewModel"]["likeButtonViewModel"]["toggleButtonViewModel"]["toggleButtonViewModel"][
                "defaultButtonViewModel"
            ]["buttonViewModel"]["accessibilityText"]

            likes_text = likes
            like_template = r"like this video along with (.*?) other people"
            text = str(likes_text)
            matches = re.findall(like_template, text, re.MULTILINE)
            likes = None
            if len(matches) >= 1:
                like_str = matches[0]
                likes = int(like_str.replace(",", ""))
        except Exception:
            likes = None
        return OrderCreate(
            owner_id=order.owner_id,
            requester_nickname=order.requester_nickname,
            playlist_name=order.playlist_name,
            donation_currency_amount=order.donation_currency_amount,
            yt_video_id=yt.video_id,
            title=yt.title,
            duration=yt.length,
            priority=order.priority,
            views=yt.views,
            likes=likes if likes else 0,
            request_id=order.request_id,
            source=order.source,
        )

    async def create_order(self, session: AsyncSession, new_order: OrderCreate) -> OrderDomain:
        return await self.order_repository.create(session, new_order)

    async def status_udpate(self, session: AsyncSession, order_id: UUID, status: Status) -> None:
        await self.order_repository.patch(session, OrderPatch(status=status), order_id)

    async def get_order(self, session: AsyncSession, order_id: UUID) -> OrderDomain:
        return await self.order_repository.get_one(session, order_id)


order_service = OrderService(order_repository)
