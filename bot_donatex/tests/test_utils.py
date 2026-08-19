from src.utils import extract_youtube_url, find, find_all


def test_extract_youtube_url_standard():
    text = "Поставь трек https://www.youtube.com/watch?v=dQw4w9WgXcQ спасибо!"
    url = extract_youtube_url(text)
    assert url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


def test_extract_youtube_url_short():
    text = "Включи https://youtu.be/dQw4w9WgXcQ"
    url = extract_youtube_url(text)
    assert url == "https://youtu.be/dQw4w9WgXcQ"


def test_extract_youtube_url_music():
    text = "Слушай https://music.youtube.com/watch?v=dQw4w9WgXcQ"
    url = extract_youtube_url(text)
    assert url == "https://music.youtube.com/watch?v=dQw4w9WgXcQ"


def test_extract_youtube_url_shorts():
    text = "Чекни шортс https://youtube.com/shorts/abcdef12345!"
    url = extract_youtube_url(text)
    assert url == "https://youtube.com/shorts/abcdef12345"


def test_extract_youtube_url_empty_or_none():
    assert extract_youtube_url("") is None
    assert extract_youtube_url(None) is None  # type: ignore
    assert extract_youtube_url("Просто донат без ссылок") is None


def test_find_and_find_all():
    items = [
        {"id": "1", "val": 10},
        {"id": "2", "val": 20},
        {"id": "3", "val": 20},
    ]

    found = find(items, lambda x: x["id"] == "2")
    assert found == {"id": "2", "val": 20}

    not_found = find(items, lambda x: x["id"] == "99")
    assert not_found is None

    all_20 = find_all(items, lambda x: x["val"] == 20)
    assert len(all_20) == 2
