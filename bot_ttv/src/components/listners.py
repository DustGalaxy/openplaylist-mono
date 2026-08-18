import uuid

from src.adapters._rabbit.broker import broker, main_exchange
from src.adapters._rabbit.dto.order import NewOrderPayload, OrderNew
from src.log_setup import LOGGER
from src.utils import find
from twitchio.ext import commands


class Listner(commands.Component):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.Component.listener()
    async def event_safe_new_order(self, payload: NewOrderPayload):
        # LOGGER.info(f"Event safe new order: {payload}")
        # LOGGER.info(f"Event users: {self.bot.users}")
        user = find(self.bot.users, lambda x: str(x.platform_user_id) == str(payload.broadcaster_id))

        if not user:
            LOGGER.error(f"User not found for broadcaster_id: {payload.broadcaster_id}")
            return

        uid = user.user_id
        event = OrderNew(
            request_id=uuid.uuid4(),
            owner_platform_id=str(payload.broadcaster_id),
            owner_id=uuid.UUID(uid),
            requester_id=str(payload.chatter_id),
            requester_nickname=payload.chatter_nickname,
            yt_video_url=payload.yt_video_url,
            priority=payload.priority,
            reward_id=payload.reward_id,
            redemption_id=payload.redemption_id,
        )
        await broker.publish(event, queue="bot.twitch.order.new", exchange=main_exchange)
