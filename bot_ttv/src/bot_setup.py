"""An example of connecting to a conduit and subscribing to EventSub when a User Authorizes the application.

This bot can be restarted as many times without needing to subscribe or worry about tokens:
- Tokens are stored in '.tio.tokens.json' by default
- Subscriptions last 72 hours after the bot is disconnected and refresh when the bot starts.

Consider reading through the documentation for AutoBot for more in depth explanations.
"""

import asyncio
from typing import Self

import asqlite

import twitchio
from twitchio import eventsub
from twitchio.ext import commands
from twitchio.exceptions import InvalidTokenException


from src.adapters._rabbit.dto.user import Tokens
from src.adapters._rabbit.broker import broker, main_exchange, auth_user_twitch_tokens_refreshed, user_token_died
from src.acl.user import get_users
from src.components.listners import Listner
from src.components.music_request import MusicRequest
from src.components.main_commands import MainCommands

from src.log_setup import LOGGER
from src.utils import find
from src.config import settings

context = {"bot": None}


class Bot(commands.AutoBot):
    def __init__(self, users: list[Tokens]) -> None:
        self.users = users
        self.prefixes = {user.platform_user_id: user.bot_settings.prefix for user in users}
        super().__init__(
            client_id=settings.TWITCH_CLIENT_ID,
            client_secret=settings.TWICTH_CLIENT_SECRET,
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

        # A list of subscriptions we would like to make to the newly authorized channel...
        sub = eventsub.ChatMessageSubscription(broadcaster_user_id=payload.user_id, user_id=self.bot_id)

        await self.multi_subscribe(
            [
                sub,
            ]
        )

        LOGGER.info("Subscribed to channel: %s", payload.user_id)

    async def add_token(
        self, token: str, refresh: str, user_id: str | None = None
    ) -> twitchio.authentication.ValidateTokenPayload:
        # Make sure to call super() as it will add the tokens interally and return us some data...
        resp: twitchio.authentication.ValidateTokenPayload = await super().add_token(token, refresh)

        # Publish an event to RabbitMQ
        user_data = {
            "twitch_id": resp.user_id,
            "access_token": token,
            "refresh_token": refresh,
            "expires_in": resp.expires_in,
        }
        # TODO - add request to RabbitMQ maybe??

        LOGGER.info(f"{user_data=}, {resp.client_id=}, {resp.user_id=}")

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
            await ttvbot.add_token(user.access_token, user.refresh_token, user.platform_user_id)
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
