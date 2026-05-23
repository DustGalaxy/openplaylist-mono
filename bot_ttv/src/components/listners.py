import uuid

from twitchio.ext import commands

from src.log_setup import LOGGER
from src.utils import find
from src.adapters._rabbit.dto.order import OrderNew, NewOrderPayload
from src.adapters._rabbit.broker import broker, main_exchange


class Listner(commands.Component):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.Component.listener()
    async def event_safe_new_order(self, payload: NewOrderPayload):
        LOGGER.info(f"Event safe new order: {payload}")
        uid = find(self.bot.users, lambda x: str(x.platform_user_id) == str(payload.broadcaster_id)).user_id # type: ignore
        event = OrderNew(
            request_id=uuid.uuid4(),
            owner_platform_id=str(payload.broadcaster_id),
            owner_id=uuid.UUID(uid),
            requester_id=payload.chatter_id,
            requester_nickname=payload.chatter_nickname,
            yt_video_url=payload.yt_video_url,
            priority=payload.priority,
        )
        await broker.publish(event, queue="bot.twitch.order.new", exchange=main_exchange)
