import re
from typing import TYPE_CHECKING, Callable
from urllib import parse
from uuid import UUID

import asqlite
from src.config import settings
from twitchio import eventsub
from twitchio.ext import commands

if TYPE_CHECKING:
    import sqlite3


def find[T](list_to_search: list[T], condition_func: Callable[[T], bool]) -> T | None:
    return next((item for item in list_to_search if condition_func(item)), None)


async def get_user_id(twitch_id: str) -> str:
    async with asqlite.create_pool("users.db") as udb:
        async with udb.acquire() as connection:
            row: sqlite3.Row = await connection.fetchone("""SELECT user_id FROM users WHERE twitch_id = ?""", (twitch_id,))

            return row["user_id"]


async def get_twitch_id(user_id: str) -> str:
    async with asqlite.create_pool("users.db") as udb:
        async with udb.acquire() as connection:
            row: sqlite3.Row = await connection.fetchone("""SELECT twitch_id FROM users WHERE user_id = ?""", (user_id,))

            return row["twitch_id"]


async def setup_database(db: asqlite.Pool) -> tuple[list[tuple[str, str]], list[eventsub.SubscriptionPayload]]:
    query = """CREATE TABLE IF NOT EXISTS tokens(user_id TEXT PRIMARY KEY, token TEXT NOT NULL, refresh TEXT NOT NULL)"""
    async with db.acquire() as connection:
        await connection.execute(query)

        # Fetch any existing tokens...
        rows: list[sqlite3.Row] = await connection.fetchall("""SELECT * from tokens""")

        tokens: list[tuple[str, str]] = []
        subs: list[eventsub.SubscriptionPayload] = []

        for row in rows:
            tokens.append((row["token"], row["refresh"]))
            subs.extend([eventsub.ChatMessageSubscription(broadcaster_user_id=row["user_id"], user_id=settings.BOT_ID)])

    return tokens, subs


def extract_data_from_msg(msg: str) -> dict[str, str]:
    # Regex pattern to match common YouTube URL formats
    youtube_pattern = r"(?:https?://)?(?:www\.)?(?:youtube\.com|youtu\.be)/(?:watch\?v=|embed/|v/|shorts/|live/|playlist\?list=|user/|channel/|c/|)([a-zA-Z0-9_-]{11}|[a-zA-Z0-9_-]+)"
    msg = str(msg)

    # Find all matches in the text
    urls = re.findall(youtube_pattern, msg)

    # Reconstruct full URLs for consistency if only IDs are extracted
    found_urls = []
    for match in urls:
        # If the match is just the ID, reconstruct a standard URL
        if len(match) == 11 and not match.startswith(("http", "www")):
            found_urls.append(f"https://www.youtube.com/watch?v={match}")
        else:
            found_urls.append(match)  # If it's a full URL or other format, keep as is

    if not bool(len(found_urls)):
        raise ValueError("No valid YouTube URLs found in the message")

    yt_url = found_urls[-1]
    playlsit_name = msg[: msg.find(yt_url)].strip()

    if not bool(len(playlsit_name)):
        raise ValueError("No playlist name found in the message")

    return {"playlsit_name": playlsit_name, "yt_url": yt_url}


def extract_youtube_video_id(url: str) -> str | None:
    """
    Examples:
    - http://youtu.be/SA2iWivDJiE
    - http://www.youtube.com/watch?v=_oPAwA_Udwc&feature=feedu
    - http://www.youtube.com/embed/SA2iWivDJiE
    - http://www.youtube.com/v/SA2iWivDJiE?version=3&amp;hl=en_US
    """
    query = parse.urlparse(url)
    if query.hostname == "youtu.be":
        return query.path[1:]
    if query.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com"):
        if query.path == "/watch":
            p = parse.parse_qs(query.query)
            return p["v"][0]
        if query.path[:7] == "/embed/":
            return query.path.split("/")[2]
        if query.path[:3] == "/v/":
            return query.path.split("/")[2]
    return None


def is_broadcaster_or_moderator():
    def predicate(ctx: commands.Context) -> bool:
        return ctx.chatter.moderator or ctx.chatter.broadcaster  # type: ignore

    return commands.guard(predicate)
