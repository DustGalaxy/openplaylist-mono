import re
from typing import Callable
from urllib import parse

from twitchio.ext import commands


def find[T](list_to_search: list[T], condition_func: Callable[[T], bool]) -> T | None:
    return next((item for item in list_to_search if condition_func(item)), None)


def extract_data_from_msg(msg: str) -> dict[str, str]:
    # Match standard or shortened YouTube URL in text
    youtube_pattern = r"https?://(?:www\.)?(?:youtube\.com/(?:watch\?[^\s]*v=|embed/|v/|shorts/|live/)|youtu\.be/)[a-zA-Z0-9_-]+"
    match = re.search(youtube_pattern, msg)
    if not match:
        raise ValueError("No valid YouTube URLs found in the message")

    yt_url = match.group(0)
    playlist_name = msg[: match.start()].strip()

    if not playlist_name:
        raise ValueError("No playlist name found in the message")

    return {"playlist_name": playlist_name, "yt_url": yt_url}


def extract_youtube_video_id(url: str) -> str | None:
    """Extract YouTube video ID from various URL formats.

    Examples:
    - http://youtu.be/SA2iWivDJiE -> SA2iWivDJiE
    - http://www.youtube.com/watch?v=_oPAwA_Udwc&feature=feedu -> _oPAwA_Udwc
    - http://www.youtube.com/embed/SA2iWivDJiE -> SA2iWivDJiE
    - http://www.youtube.com/v/SA2iWivDJiE?version=3&hl=en_US -> SA2iWivDJiE
    - https://www.youtube.com/shorts/SA2iWivDJiE -> SA2iWivDJiE
    """
    if not url:
        return None
    url = url.strip()
    query = parse.urlparse(url)
    if query.hostname in ("youtu.be", "www.youtu.be"):
        return query.path.lstrip("/").split("/")[0].split("?")[0]
    if query.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com"):
        if query.path == "/watch":
            p = parse.parse_qs(query.query)
            if "v" in p and len(p["v"]) > 0:
                return p["v"][0]
        if query.path.startswith("/embed/"):
            parts = query.path.split("/")
            return parts[2] if len(parts) > 2 else None
        if query.path.startswith("/v/"):
            parts = query.path.split("/")
            return parts[2] if len(parts) > 2 else None
        if query.path.startswith("/shorts/"):
            parts = query.path.split("/")
            return parts[2] if len(parts) > 2 else None
        if query.path.startswith("/live/"):
            parts = query.path.split("/")
            return parts[2] if len(parts) > 2 else None
    return None


def is_broadcaster_or_moderator():
    def predicate(ctx: commands.Context) -> bool:
        return bool(ctx.chatter.moderator or ctx.chatter.broadcaster)  # type: ignore

    return commands.guard(predicate)

