import re
import json
from typing import Union

from pytubefix import YouTube
import requests

from src.dal._redis.broker import get_broker
from src.dto.order import WebNewOrder, TTVNewOrder, YTNewOrder, DANewOrder
from src.models.order import OrderCreate, STRATEGIES

from src.utils import extract_youtube_video_id, parse_ISO_8601
from src.settings import settings
from src.exceptions import NotEmbeddable


class OrderService:
    def get_data_from_pytube(self, url):
        yt = YouTube(url)
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

        return {
            "title": yt.title,
            "length": yt.length,
            "likes": likes if likes else 0,
            "views": yt.views,
        }

    def get_data_from_youtube_api(self, video_id, api_key) -> dict:
        BASE_YOUTUBE_API_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

        params = {
            "part": "snippet,statistics,status,contentDetails",
            "id": video_id,
            "key": api_key,
        }

        response = requests.get(BASE_YOUTUBE_API_VIDEOS_URL, params=params)
        response.raise_for_status()
        json_data = response.json()

        if not json_data.get("items"):
            raise ValueError("Invalid YouTube video URL")

        video_item = json_data["items"][0]

        return {
            "title": video_item["snippet"]["title"],
            "author": video_item["snippet"]["channelTitle"],
            "embeddable": video_item["status"]["embeddable"],
            "views": int(video_item["statistics"].get("viewCount", 0)),
            "likes": int(video_item["statistics"].get("likeCount", 0)),
            "length": parse_ISO_8601(video_item["contentDetails"]["duration"]),  # формат ISO 8601 (например, PT4M13S)
        }

    def get_from_cache(self, video_id) -> dict | None:
        data = get_broker().get(video_id)
        if data is not None and str(data) != "None":
            return json.loads(str(data))
        else:
            return

    def save_to_cache(self, video_id, data):
        return get_broker().set(video_id, json.dumps(data), ex=60 * 60 * 24 * 3)

    async def init_order(
        self, order: Union[WebNewOrder, TTVNewOrder, YTNewOrder, DANewOrder], from_owner: bool = False
    ) -> OrderCreate:
        yt_video_id = extract_youtube_video_id(order.yt_video_url)
        if not yt_video_id:
            raise ValueError("Invalid YouTube video URL")
        yt_video_id = yt_video_id.strip()
        data: dict = self.get_from_cache(yt_video_id)  # pyright: ignore[reportAssignmentType]

        if not data:
            try:
                if not settings.YOUTUBE_API_KEY:
                    raise ValueError("YOUTUBE_API_KEY not found")
                data = self.get_data_from_youtube_api(yt_video_id, settings.YOUTUBE_API_KEY)
                if not data["embeddable"]:
                    raise NotEmbeddable
            except (requests.HTTPError, ValueError):
                data = self.get_data_from_pytube(order.yt_video_url)

            self.save_to_cache(yt_video_id, data)

        print(f"Получен заказ: {order}")
        extra_data = STRATEGIES[order.source].model_validate(order, from_attributes=True)

        return OrderCreate(
            owner_id=order.owner_id,
            from_owner=from_owner,
            owner_platform_id=order.owner_platform_id if not isinstance(order, WebNewOrder) else "web",
            requester_id=order.requester_id,
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
