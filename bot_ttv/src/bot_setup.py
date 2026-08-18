"""An example of connecting to a conduit and subscribing to EventSub when a User Authorizes the application.

This bot can be restarted as many times without needing to subscribe or worry about tokens:
- Tokens are stored in '.tio.tokens.json' by default
- Subscriptions last 72 hours after the bot is disconnected and refresh when the bot starts.

Consider reading through the documentation for AutoBot for more in depth explanations.
"""

import asyncio
from typing import Self

import twitchio
from twitchio import eventsub
from twitchio.exceptions import InvalidTokenException
from twitchio.ext import commands

from src.acl.user import get_users
from src.adapters._rabbit.broker import auth_user_twitch_tokens_refreshed, broker, main_exchange, user_token_died
from src.adapters._rabbit.dto.user import Tokens
from src.components.listners import Listner
from src.components.main_commands import MainCommands
from src.components.music_request import MusicRequest
from src.config import settings
from src.log_setup import LOGGER
from src.utils import find

context = {"bot": None}


class Bot(commands.AutoBot):
    def __init__(self, users: list[Tokens]) -> None:
        self.users = users
        self.prefixes = {user.platform_user_id: user.bot_settings.prefix for user in users}
        super().__init__(
            client_id=settings.TWITCH_CLIENT_ID,
            client_secret=settings.TWITCH_CLIENT_SECRET,
            bot_id=settings.BOT_ID,
            owner_id=settings.OWNER_ID,
            prefix=self.custom_prefix,  # type: ignore
            # subscriptions=[
            #     eventsub.ChatMessageSubscription(broadcaster_user_id=user.platform_user_id, user_id=self.bot_id)
            #     for user in users
            # ],
        )

    async def custom_prefix(self, bot: Self, message: twitchio.ChatMessage) -> str:

        return bot.prefixes.get(message.broadcaster.id, "::")

    async def setup_hook(self) -> None:
        # Add our component which contains our commands...
        await self.add_component(MainCommands(self))

        # Add our component which contains our music request commands...
        await self.add_component(MusicRequest(self))

        await self.add_component(Listner(self))

    async def event_oauth_authorized(self, payload: twitchio.authentication.UserTokenPayload) -> None:
        await self.add_token(payload.access_token, payload.refresh_token, payload.user_id)

        if not payload.user_id:
            return

        if payload.user_id == self.bot_id:
            # We usually don't want subscribe to events on the bots channel...
            return

        sub_chat = eventsub.ChatMessageSubscription(broadcaster_user_id=payload.user_id, user_id=self.bot_id)
        sub_points = eventsub.ChannelPointsRedeemAddSubscription(broadcaster_user_id=payload.user_id)

        await self.multi_subscribe([sub_chat, sub_points])

        LOGGER.info("Subscribed to channel chat & points: %s", payload.user_id)

    async def add_token(
        self, token: str, refresh: str, event: Tokens | None = None
    ) -> twitchio.authentication.ValidateTokenPayload:
        # Make sure to call super() as it will add the tokens interally and return us some data...
        resp: twitchio.authentication.ValidateTokenPayload = await super().add_token(token, refresh)

        if event:
            self.users = [u for u in self.users if u.platform_user_id != event.platform_user_id]
            self.users.append(event)
            self.prefixes[event.platform_user_id] = event.bot_settings.prefix

        return resp

    async def token_refreshed(self, payload: twitchio.payloads.TokenRefreshedPayload) -> None:
        user_data = {
            "twitch_id": payload.user_id,
            "access_token": payload.token,
            "refresh_token": payload.refresh_token,
            "expires_in": payload.expires_in,
        }
        await broker.publish(user_data, auth_user_twitch_tokens_refreshed, exchange=main_exchange)
        LOGGER.info("Publishing refreshed tokens to RabbitMQ...")

    async def remove_token(self, user_id: str) -> None:
        await super().remove_token(user_id)

        LOGGER.info("Removed token for user: %s", user_id)

    async def event_ready(self) -> None:
        LOGGER.info("Successfully logged in as: %s", self.bot_id)


async def setup_bot() -> commands.Bot:
    users = await get_users()
    ttvbot = Bot(users)
    for user in users:
        try:
            await ttvbot.add_token(user.access_token, user.refresh_token, user)
        except InvalidTokenException:
            await broker.publish(
                {
                    "access_token": user.access_token,
                    "refresh_token": user.refresh_token,
                    "platform_user_id": user.platform_user_id,
                },
                user_token_died,
                exchange=main_exchange,
            )
            continue

    global context
    context["bot"] = ttvbot  # pyright: ignore[reportArgumentType]
    return ttvbot
