from uuid import uuid4

from src.dto.order import POSSIBLE_ORDER_TYPE, WebNewOrder
from src.dto.youtube import YouTubePlaylistType
from src.exceptions import (
    DynamicMixNotSupported,
    InvalidYouTubeUrl,
    NotEmbeddable,
    PlaylistOrdersNotAllowedForViewers,
)
from src.models.order import STRATEGIES, OrderCreate
from src.services.youtube_service import VideoInfo, youtube_service
from src.utils import parse_youtube_url


class OrderService:
    def extract_extra_data(self, order: POSSIBLE_ORDER_TYPE):
        return STRATEGIES[order.source].model_validate(order, from_attributes=True)

    def _create_order_dto(
        self,
        order: POSSIBLE_ORDER_TYPE,
        from_owner: bool,
        yt_video_id: str,
        data: VideoInfo,
    ) -> OrderCreate:
        extra_data = self.extract_extra_data(order)
        return OrderCreate(
            owner_id=order.owner_id,
            from_owner=from_owner,
            owner_platform_id=order.owner_platform_id if not isinstance(order, WebNewOrder) else "web",
            requester_id=order.requester_id,
            requester_nickname=order.requester_nickname,
            yt_video_id=yt_video_id,
            title=data["title"],
            author=data.get("author", "Unknown"),
            duration=data["length"],
            priority=order.priority,
            views=data["views"],
            likes=data["likes"],
            extra_data=extra_data,
            request_id=uuid4(),
            source=order.source,
        )

    async def init_orders(
        self,
        order: POSSIBLE_ORDER_TYPE,
        from_owner: bool,
        start_from_target: bool = False,
    ) -> list[OrderCreate]:
        parsed = parse_youtube_url(order.yt_video_url)
        if not parsed:
            raise InvalidYouTubeUrl("Invalid YouTube video URL")

        # 1. Dynamic mix playlist handling
        if parsed.playlist_id and parsed.playlist_type == YouTubePlaylistType.AUTOMATIC_MIX:
            if not from_owner and parsed.video_id:
                # Fallback to single track for viewers when a video_id is present
                data = youtube_service.get_video_info(parsed.video_id, order.yt_video_url)
                if not data["embeddable"]:
                    raise NotEmbeddable()
                return [self._create_order_dto(order, from_owner, parsed.video_id, data)]
            raise DynamicMixNotSupported("Dynamic YouTube mixes are not supported")

        # 2. Standard / Custom playlist handling
        if parsed.playlist_id and parsed.playlist_type == YouTubePlaylistType.USER_CUSTOM:
            if not from_owner:
                if parsed.video_id:
                    # Viewers ordering video_in_playlist links get only the single video
                    data = youtube_service.get_video_info(parsed.video_id, order.yt_video_url)
                    if not data["embeddable"]:
                        raise NotEmbeddable()
                    return [self._create_order_dto(order, from_owner, parsed.video_id, data)]
                raise PlaylistOrdersNotAllowedForViewers("Playlist orders are only allowed for playlist owners")

            # Owner importing a playlist (limit 50 tracks)
            start_vid = parsed.video_id if (start_from_target and parsed.video_id) else None
            tracks_info = youtube_service.get_playlist_tracks(parsed.playlist_id, start_video_id=start_vid, limit=50)

            if not tracks_info and parsed.video_id:
                # Fallback to single track if playlist track extraction yields nothing
                data = youtube_service.get_video_info(parsed.video_id, order.yt_video_url)
                if not data["embeddable"]:
                    raise NotEmbeddable()
                return [self._create_order_dto(order, from_owner, parsed.video_id, data)]

            if not tracks_info:
                raise InvalidYouTubeUrl("No accessible tracks found in YouTube playlist")

            orders: list[OrderCreate] = []
            for track_data in tracks_info:
                if track_data.get("embeddable", True):
                    orders.append(self._create_order_dto(order, from_owner, track_data["yt_video_id"], track_data))

            return orders

        # 3. Single video handling
        if parsed.video_id:
            data = youtube_service.get_video_info(parsed.video_id, order.yt_video_url)
            if not data["embeddable"]:
                raise NotEmbeddable()
            return [self._create_order_dto(order, from_owner, parsed.video_id, data)]

        raise InvalidYouTubeUrl("Invalid YouTube video URL")

    async def init_order(self, order: POSSIBLE_ORDER_TYPE, from_owner: bool) -> OrderCreate:
        orders = await self.init_orders(order, from_owner)
        if not orders:
            raise InvalidYouTubeUrl("Could not process video link")
        return orders[0]


order_service = OrderService()
