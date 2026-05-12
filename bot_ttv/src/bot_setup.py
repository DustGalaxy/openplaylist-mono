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


from src.adapters._rabbit.broker import broker, main_exchange, auth_user_twitch_tokens_refreshed, user_token_died
from src.acl.user import get_users
from src.components.listners import Listner
from src.components.music_request import MusicRequest
from src.components.main_commands import MainCommands
from src.log_setup import LOGGER
from src.config import settings
from src.utils import setup_database

context = {"bot": None}


class Bot(commands.Bot):
    def __init__(self, *, subs: list[eventsub.SubscriptionPayload]) -> None:

        super().__init__(
            client_id=settings.TWITCH_CLIENT_ID,
            client_secret=settings.TWICTH_CLIENT_SECRET,
            bot_id=settings.BOT_ID,
            owner_id=settings.OWNER_ID,
            prefix=self.custom_prefix,  # type: ignore
        )

    async def custom_prefix(self, bot: Self, message: twitchio.ChatMessage) -> str:

        return "::" if message.broadcaster.id else "!!"

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
        

        resp = await self.subscribe_websocket(sub)

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
        LOGGER.info(f"{user_data=}, {resp.client_id=}, {resp.user_id=}")
        if user_data["twitch_id"] is not None and resp.user_id not in [settings.BOT_ID]:
            LOGGER.info("Publishing to RabbitMQ...")
            await broker.publish(user_data, auth_user_twitch_tokens_refreshed, exchange=main_exchange)

        # Store our tokens in a simple SQLite Database when they are authorized...
        query = """
        INSERT INTO tokens (user_id, token, refresh)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET
            token = excluded.token,
            refresh = excluded.refresh;
        """

        async with asqlite.create_pool("tokens.db") as token_database:
            async with token_database.acquire() as connection:
                await connection.execute(query, (resp.user_id, token, refresh))

        LOGGER.info("Added token to the database for user: %s", resp.user_id)
        return resp

    async def remove_token(self, user_id: str) -> None:
        await super().remove_token(user_id)
        async with asqlite.create_pool("tokens.db") as token_database:
            async with token_database.acquire() as connection:
                await connection.execute("DELETE FROM tokens WHERE user_id = ?", (user_id,))

        LOGGER.info("Removed token from the database for user: %s", user_id)

    async def event_ready(self) -> None:
        LOGGER.info("Successfully logged in as: %s", self.bot_id)


async def setup_bot() -> commands.AutoBot:
    users = await get_users()
    LOGGER.info(f"Users: {users}")
    async with asqlite.create_pool("users.db") as udb:
        async with udb.acquire() as connection:
            query = """CREATE TABLE IF NOT EXISTS users(user_id TEXT PRIMARY KEY, twitch_id TEXT NOT NULL UNIQUE)"""
            await connection.execute(query)

            insert_query = "INSERT INTO users (user_id, twitch_id) VALUES (?, ?) ON CONFLICT DO UPDATE SET user_id = excluded.user_id, twitch_id = excluded.twitch_id;"
            for user in users:
                await connection.execute(insert_query, (user.user_id, user.twitch_id))

    async with asqlite.create_pool("tokens.db") as tdb:
        tokens, subs = await setup_database(tdb)

        ttvbot = Bot(subs=subs)
        for pair in tokens:
            try:
                await ttvbot.add_token(*pair)
            except InvalidTokenException:
                await broker.publish(
                    {"access_token": pair[0], "refresh_token": pair[1]}, user_token_died, exchange=main_exchange
                )
                continue

        global context
        context["bot"] = ttvbot  # pyright: ignore[reportArgumentType]
        return ttvbot
