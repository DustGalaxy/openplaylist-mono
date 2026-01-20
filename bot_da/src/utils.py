import re
from urllib import parse


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


def extract_data_from_msg(msg: str) -> dict[str, str]:
    # Regex pattern to match common YouTube URL formats
    youtube_pattern = r"(?:https?://)?(?:www\.)?(?:youtube\.com|youtu\.be)/(?:watch\?v=|embed/|v/|shorts/|live/|playlist\?list=|user/|channel/|c/)([a-zA-Z0-9_-]{11}|[a-zA-Z0-9_-]+)"

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
