from utils import extract_youtube_url, find, find_all, video_id


def test_extract_standard_youtube_url():
    text = "Поставь трек https://www.youtube.com/watch?v=dQw4w9WgXcQ плиз"
    url = extract_youtube_url(text)
    assert url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


def test_extract_short_youtu_be_url():
    text = "Донат с музыкой: https://youtu.be/dQw4w9WgXcQ! Спасибо!"
    url = extract_youtube_url(text)
    assert url == "https://youtu.be/dQw4w9WgXcQ"


def test_extract_youtube_music_url():
    text = "Врубай https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=abcdef"
    url = extract_youtube_url(text)
    assert url == "https://music.youtube.com/watch?v=dQw4w9WgXcQ?si=abcdef" or "music.youtube.com" in url


def test_extract_youtube_shorts_url():
    text = "Чекни шортс https://youtube.com/shorts/dQw4w9WgXcQ"
    url = extract_youtube_url(text)
    assert url == "https://youtube.com/shorts/dQw4w9WgXcQ"


def test_extract_youtube_no_url():
    text = "Просто привет стримеру, хорошего стрима!"
    url = extract_youtube_url(text)
    assert url is None


def test_find_and_find_all():
    items = [{"id": 1, "active": True}, {"id": 2, "active": False}, {"id": 3, "active": True}]
    found = find(items, lambda x: x["id"] == 2)
    assert found == {"id": 2, "active": False}

    not_found = find(items, lambda x: x["id"] == 99)
    assert not_found is None

    all_active = find_all(items, lambda x: x["active"])
    assert len(all_active) == 2


def test_video_id_parsing():
    assert video_id("http://youtu.be/SA2iWivDJiE") == "SA2iWivDJiE"
    assert video_id("http://www.youtube.com/watch?v=SA2iWivDJiE") == "SA2iWivDJiE"
    assert video_id("http://www.youtube.com/embed/SA2iWivDJiE") == "SA2iWivDJiE"
