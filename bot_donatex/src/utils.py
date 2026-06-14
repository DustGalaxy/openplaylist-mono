import re
from typing import Callable, Optional


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
