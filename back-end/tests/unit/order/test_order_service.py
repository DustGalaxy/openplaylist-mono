import pytest
import requests
from uuid import uuid4
from unittest.mock import MagicMock

from src.services.order_service import OrderService


@pytest.fixture
def order_service():
    return OrderService()


@pytest.fixture
def mock_order():
    order = MagicMock()
    order.yt_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    order.owner_id = uuid4()          # Валидный UUID object
    order.request_id = uuid4()        # Валидный UUID object
    order.priority = "1"              # Валидная строка (string_type)
    order.source = "web"              # Нижний регистр для Enum ('twitch', 'youtube', 'web', и т.д.)
    order.owner_platform_id = "platform_user_777"
    order.requester_id = "req_1"
    order.requester_nickname = "Rick"
    return order


# =====================================================================
# Метод init_order
# =====================================================================

@pytest.mark.asyncio
async def test_init_order_invalid_url(order_service, mock_order, mocker):
    """Ошибка: Невозможно распарсить id из ссылки."""
    mocker.patch("src.services.order_service.extract_youtube_video_id", return_value=None)

    with pytest.raises(ValueError, match="Invalid YouTube video URL"):
        await order_service.init_order(mock_order)


@pytest.mark.asyncio
async def test_init_order_hit_cache(order_service, mock_order, mocker):
    """Успех: Данные берутся из кэша, внешние API/pytube не вызываются."""
    mocker.patch("src.services.order_service.extract_youtube_video_id", return_value="dQw4w9WgXcQ")
    
    cached_data = {"title": "Cached Track", "length": 200, "views": 50, "likes": 5}
    mocker.patch.object(order_service, "get_from_cache", return_value=cached_data)
    
    spy_api = mocker.patch.object(order_service, "get_data_from_youtube_api")
    spy_pytube = mocker.patch.object(order_service, "get_data_from_pytube")
    
    # Мокаем стратегию так, чтобы она возвращала валидный dict вместо MagicMock
    mock_strategy = MagicMock()
    mock_strategy.model_validate.return_value = {}  
    mocker.patch("src.services.order_service.STRATEGIES", {mock_order.source: mock_strategy})

    res = await order_service.init_order(mock_order, from_owner=True)

    assert res.title == "Cached Track"
    assert res.duration == 200
    assert res.from_owner is True
    spy_api.assert_not_called()
    spy_pytube.assert_not_called()


@pytest.mark.asyncio
async def test_init_order_miss_cache_use_api(order_service, mock_order, mocker):
    """Успех: Кэш пуст, данные успешно запрашиваются через YouTube API и кэшируются."""
    mocker.patch("src.services.order_service.extract_youtube_video_id", return_value="dQw4w9WgXcQ ")
    mocker.patch.object(order_service, "get_from_cache", return_value=None)
    
    mocker.patch("src.services.order_service.settings.YOUTUBE_API_KEY", "secret_key")
    
    api_data = {"title": "API Track", "length": 180, "views": 100, "likes": 12, "embeddable": True}
    spy_api = mocker.patch.object(order_service, "get_data_from_youtube_api", return_value=api_data)
    spy_save_cache = mocker.patch.object(order_service, "save_to_cache")
    
    mock_strategy = MagicMock()
    mock_strategy.model_validate.return_value = {}
    mocker.patch("src.services.order_service.STRATEGIES", {mock_order.source: mock_strategy})

    res = await order_service.init_order(mock_order)

    assert res.title == "API Track"
    spy_api.assert_called_once_with("dQw4w9WgXcQ", "secret_key")
    spy_save_cache.assert_called_once_with("dQw4w9WgXcQ", api_data)


@pytest.mark.asyncio
async def test_init_order_fallback_to_pytube(order_service, mock_order, mocker):
    """Успех: API упало с ошибкой, срабатывает фоллбэк на метод pytube."""
    mocker.patch("src.services.order_service.extract_youtube_video_id", return_value="dQw4w9WgXcQ")
    mocker.patch.object(order_service, "get_from_cache", return_value=None)
    
    mocker.patch("src.services.order_service.settings.YOUTUBE_API_KEY", "secret_key")
    mocker.patch.object(order_service, "get_data_from_youtube_api", side_effect=requests.HTTPError())
    
    pytube_data = {"title": "Pytube Track", "length": 300, "views": 99, "likes": 0}
    spy_pytube = mocker.patch.object(order_service, "get_data_from_pytube", return_value=pytube_data)
    spy_save_cache = mocker.patch.object(order_service, "save_to_cache")
    
    mock_strategy = MagicMock()
    mock_strategy.model_validate.return_value = {}
    mocker.patch("src.services.order_service.STRATEGIES", {mock_order.source: mock_strategy})

    res = await order_service.init_order(mock_order)

    assert res.title == "Pytube Track"
    spy_pytube.assert_called_once_with(mock_order.yt_video_url)
    spy_save_cache.assert_called_once_with("dQw4w9WgXcQ", pytube_data)