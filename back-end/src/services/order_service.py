import re
import json
from typing import Union

from pytubefix import YouTube, extract

from adapters._redis.broker import redis_adapter
from dto.order import WebNewOrder, TTVNewOrder, YTNewOrder, DANewOrder
from models.order import OrderCreate, STRATEGIES


class OrderService:
    async def init_order(
        self, order: Union[WebNewOrder, TTVNewOrder, YTNewOrder, DANewOrder], from_owner: bool = False
    ) -> OrderCreate:
        yt_video_id = extract.video_id(order.yt_video_url)
        cached_info: str = redis_adapter.get(yt_video_id)  # pyright: ignore[reportAssignmentType]

        if not cached_info:
            try:
                yt = YouTube(order.yt_video_url)
                first_part = yt.initial_data["contents"]["twoColumnWatchNextResults"]["results"]["results"]["contents"][
                    0
                ]
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

            data = {
                "title": yt.title,
                "length": yt.length,
                "likes": likes if likes else 0,
                "views": yt.views,
            }

            redis_adapter.set(yt_video_id, json.dumps(data))

        else:
            data = json.loads((cached_info))

        print(f"Получен заказ: {order}")
        extra_data = STRATEGIES[order.source].model_validate(order, from_attributes=True)


        return OrderCreate(
            owner_id=order.owner_id,
            from_owner=from_owner,
            requester_nickname=order.requester_nickname,
            yt_video_id=yt_video_id,
            title=data["title"],
            duration=data["length"],
            priority=order.priority,
            views=data["views"],
            likes=data["likes"],
            extra_data=extra_data,
            request_id=order.request_id,
            source=order.source,
        )


order_service = OrderService()
