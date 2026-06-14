import re
from urllib import parse
from typing import Callable, Optional


def video_id(value: str) -> str | None:
    """
    Examples:
    - http://youtu.be/SA2iWivDJiE
    - http://www.youtube.com/watch?v=_oPAwA_Udwc&feature=feedu
    - http://www.youtube.com/embed/SA2iWivDJiE
    - http://www.youtube.com/v/SA2iWivDJiE?version=3&amp;hl=en_US
    """
    query = parse.urlparse(value)
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
    # fail?
    return None


def extract_youtube_url(text: str) -> Optional[str]:
    """
    Extracts the first valid YouTube or YouTube Music URL from a text string.
    Supports: youtube.com, youtu.be, music.youtube.com, /shorts/, /embed/, etc.
    """
    if not text or not isinstance(text, str):
        return None

    # Updated regex to include music.youtube.com
    youtube_regex = (
        r"(https?://)?(www\.)?(m\.|music\.)?"
        r"(youtube\.com|youtu\.be|youtube-nocookie\.com)"
        r"(/shorts/|/embed/|/v/|/watch\?v=|/)?"
        r"([a-zA-Z0-9_-]{11})"
        r'(\?[^ \s\n\t"\'<>*,;]*)?'
    )

    match = re.search(youtube_regex, text)
    if match:
        return match.group(0).strip(".,?!:;)")

    return None


def find[T](list_to_search: list[T], condition_func: Callable[[T], bool]) -> T | None:
    return next((item for item in list_to_search if condition_func(item)), None)


def find_all[T](list_to_search: list[T], condition_func: Callable[[T], bool]) -> list[T]:
    return [item for item in list_to_search if condition_func(item)]
