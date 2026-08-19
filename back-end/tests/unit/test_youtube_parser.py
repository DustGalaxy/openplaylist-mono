from src.dto.youtube import YouTubePlaylistType, YouTubeUrlType
from src.utils import classify_youtube_playlist_id, parse_youtube_url


def test_classify_youtube_playlist_id():
    assert classify_youtube_playlist_id("PL1234567890") == YouTubePlaylistType.USER_CUSTOM
    assert classify_youtube_playlist_id("OLAK5uy_foo") == YouTubePlaylistType.USER_CUSTOM
    assert classify_youtube_playlist_id("FL1234") == YouTubePlaylistType.USER_CUSTOM

    assert classify_youtube_playlist_id("RD1234567890") == YouTubePlaylistType.AUTOMATIC_MIX
    assert classify_youtube_playlist_id("RDMM") == YouTubePlaylistType.AUTOMATIC_MIX
    assert classify_youtube_playlist_id("RDCLAK5uy_foo") == YouTubePlaylistType.AUTOMATIC_MIX
    assert classify_youtube_playlist_id("UL12345") == YouTubePlaylistType.AUTOMATIC_MIX
    assert classify_youtube_playlist_id("TL12345") == YouTubePlaylistType.AUTOMATIC_MIX


def test_parse_youtube_url_video_only():
    res = parse_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert res is not None
    assert res.url_type == YouTubeUrlType.VIDEO
    assert res.video_id == "dQw4w9WgXcQ"
    assert res.playlist_id is None

    res_short = parse_youtube_url("https://youtu.be/dQw4w9WgXcQ")
    assert res_short is not None
    assert res_short.url_type == YouTubeUrlType.VIDEO
    assert res_short.video_id == "dQw4w9WgXcQ"


def test_parse_youtube_url_playlist_only():
    res = parse_youtube_url("https://www.youtube.com/playlist?list=PL1234567890")
    assert res is not None
    assert res.url_type == YouTubeUrlType.PLAYLIST
    assert res.playlist_id == "PL1234567890"
    assert res.video_id is None
    assert res.playlist_type == YouTubePlaylistType.USER_CUSTOM


def test_parse_youtube_url_video_in_playlist():
    res = parse_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890")
    assert res is not None
    assert res.url_type == YouTubeUrlType.VIDEO_IN_PLAYLIST
    assert res.video_id == "dQw4w9WgXcQ"
    assert res.playlist_id == "PL1234567890"
    assert res.playlist_type == YouTubePlaylistType.USER_CUSTOM


def test_parse_youtube_url_dynamic_mix():
    res = parse_youtube_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RD1234567890")
    assert res is not None
    assert res.url_type == YouTubeUrlType.VIDEO_IN_PLAYLIST
    assert res.video_id == "dQw4w9WgXcQ"
    assert res.playlist_id == "RD1234567890"
    assert res.playlist_type == YouTubePlaylistType.AUTOMATIC_MIX
