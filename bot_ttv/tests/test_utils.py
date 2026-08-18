import pytest
from src.utils import extract_data_from_msg, extract_youtube_video_id, find


def test_extract_youtube_video_id_standard():
    assert extract_youtube_video_id("http://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("https://m.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"


def test_extract_youtube_video_id_shortened():
    assert extract_youtube_video_id("http://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("https://youtu.be/dQw4w9WgXcQ?t=42") == "dQw4w9WgXcQ"


def test_extract_youtube_video_id_embed_and_shorts():
    assert extract_youtube_video_id("https://www.youtube.com/embed/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("https://www.youtube.com/v/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("https://www.youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("https://www.youtube.com/live/dQw4w9WgXcQ") == "dQw4w9WgXcQ"


def test_extract_youtube_video_id_invalid():
    assert extract_youtube_video_id("") is None
    assert extract_youtube_video_id("https://twitch.tv/streamer") is None
    assert extract_youtube_video_id("just random text") is None


def test_extract_data_from_msg():
    result = extract_data_from_msg("chill_vibes https://youtu.be/dQw4w9WgXcQ")
    assert result["playlist_name"] == "chill_vibes"
    assert "dQw4w9WgXcQ" in result["yt_url"]


def test_find_helper():
    items = [{"id": 1, "name": "alice"}, {"id": 2, "name": "bob"}]
    assert find(items, lambda x: x["id"] == 2) == {"id": 2, "name": "bob"}
    assert find(items, lambda x: x["id"] == 999) is None
