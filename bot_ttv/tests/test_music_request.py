from unittest.mock import MagicMock, patch
import uuid
from src.components.music_request import (
    extract_user_roles,
    is_mr_enabled,
    set_mr_enabled,
    is_mr_points_enabled,
    set_mr_points_enabled,
)
from src.adapters._rabbit.dto.order import NewOrderPayload, OrderNew, OrderUpdate
from src.adapters._rabbit.dto.user import Tokens, TwitchBotSettings, SettingsConteiner


def test_extract_user_roles():
    author = MagicMock()
    author.broadcaster = True
    author.moderator = True
    author.vip = True
    author.subscriber = True
    author.turbo = False
    author.artist = True
    author.founder = False

    roles = extract_user_roles(author)
    assert roles == ["broadcaster", "moderator", "vip", "subscriber", "artist"]


def test_extract_user_roles_empty():
    author = MagicMock()
    author.broadcaster = False
    author.moderator = False
    author.vip = False
    author.subscriber = False
    author.turbo = False
    author.artist = False
    author.founder = False

    roles = extract_user_roles(author)
    assert roles == []


@patch("src.components.music_request.redis_adapter")
def test_redis_mr_enabled_flags(mock_redis):
    # Test new key present
    mock_redis.get.side_effect = lambda k: "1" if k == "ttv:channel:123:mr_enabled" else None
    assert is_mr_enabled("123", "streamer") is True

    # Test fallback to legacy key
    mock_redis.get.side_effect = lambda k: "1" if k == "streamer:mr:enable" else None
    assert is_mr_enabled("123", "streamer") is True

    # Test set_mr_enabled sets both keys
    set_mr_enabled("123", "streamer", True)
    assert mock_redis.set.call_count == 2


@patch("src.components.music_request.redis_adapter")
def test_redis_mr_points_flags(mock_redis):
    mock_redis.get.side_effect = lambda k: "1" if k == "ttv:channel:123:points_enabled" else None
    assert is_mr_points_enabled("123", "streamer") is True

    set_mr_points_enabled("123", "streamer", False)
    assert mock_redis.set.call_count == 2


def test_order_dtos():
    payload = NewOrderPayload(
        broadcaster_id="12345",
        chatter_id="67890",
        chatter_nickname="viewer1",
        yt_video_url="https://youtu.be/dQw4w9WgXcQ",
        priority="points:moderator:vip",
    )
    assert payload.broadcaster_id == "12345"
    assert payload.priority == "points:moderator:vip"

    uid = uuid.uuid4()
    order_new = OrderNew(
        request_id=uuid.uuid4(),
        owner_platform_id="12345",
        owner_id=uid,
        requester_id="67890",
        requester_nickname="viewer1",
        yt_video_url="https://youtu.be/dQw4w9WgXcQ",
        priority="points:moderator:vip",
    )
    assert order_new.owner_id == uid
    assert order_new.owner_platform_id == "12345"


def test_settings_dtos():
    settings = TwitchBotSettings(prefix="!")
    container = SettingsConteiner(platform_user_id="12345", settings=settings)
    assert container.settings.prefix == "!"
    assert container.platform_user_id == "12345"


@patch("src.components.music_request.redis_adapter")
def test_channel_reward_id_helpers(mock_redis):
    from src.components.music_request import get_channel_reward_id, set_channel_reward_id

    mock_redis.get.return_value = b"reward-uuid-123"
    assert get_channel_reward_id("999") == "reward-uuid-123"

    set_channel_reward_id("999", "reward-uuid-456")
    mock_redis.set.assert_called_once_with(name="ttv:channel:999:reward_id", value="reward-uuid-456")


import pytest
from src.components.music_request import (
    MusicRequest,
    get_or_create_channel_reward,
)


@pytest.mark.asyncio
@patch("src.components.music_request.get_channel_reward_id")
async def test_get_or_create_channel_reward_cached(mock_get_cached):
    mock_get_cached.return_value = "cached-uuid"
    broadcaster = MagicMock()
    broadcaster.id = "12345"
    broadcaster.fetch_custom_rewards = pytest.importorskip("unittest.mock").AsyncMock(
        return_value=[MagicMock(id="cached-uuid")]
    )

    reward_id = await get_or_create_channel_reward(broadcaster)
    assert reward_id == "cached-uuid"


@pytest.mark.asyncio
@patch("src.components.music_request.set_channel_reward_id")
@patch("src.components.music_request.get_channel_reward_id")
async def test_get_or_create_channel_reward_create_new(mock_get_cached, mock_set_cached):
    mock_get_cached.return_value = None
    broadcaster = MagicMock()
    broadcaster.id = "12345"
    broadcaster.fetch_custom_rewards = pytest.importorskip("unittest.mock").AsyncMock(return_value=[])
    new_reward = MagicMock(id="new-uuid-777")
    broadcaster.create_custom_reward = pytest.importorskip("unittest.mock").AsyncMock(return_value=new_reward)

    reward_id = await get_or_create_channel_reward(broadcaster)
    assert reward_id == "new-uuid-777"
    mock_set_cached.assert_called_once_with("12345", "new-uuid-777")


@pytest.mark.asyncio
@patch("src.components.music_request.is_mr_points_enabled")
@patch("src.components.music_request.get_channel_reward_id")
async def test_event_channel_points_redeem_add_invalid_url(mock_get_id, mock_is_enabled):
    mock_get_id.return_value = "my-reward-id"
    mock_is_enabled.return_value = True

    bot = MagicMock()
    bot.bot_id = "bot123"
    partial_user = MagicMock()
    partial_user.send_message = pytest.importorskip("unittest.mock").AsyncMock()
    bot.create_partialuser.return_value = partial_user

    mr_comp = MusicRequest(bot)

    payload = MagicMock()
    payload.broadcaster.id = "12345"
    payload.broadcaster.name = "streamer"
    payload.reward.id = "my-reward-id"
    payload.user.id = "viewer99"
    payload.user.name = "viewer_name"
    payload.user_input = "not a youtube link"
    payload.refund = pytest.importorskip("unittest.mock").AsyncMock()

    await mr_comp.event_custom_redemption_add(payload)

    payload.refund.assert_awaited_once_with(token_for="12345")
    partial_user.send_message.assert_awaited_once()
    bot.safe_dispatch.assert_not_called()


@pytest.mark.asyncio
@patch("src.components.music_request.is_mr_points_enabled")
@patch("src.components.music_request.get_channel_reward_id")
async def test_event_custom_redemption_add_valid(mock_get_id, mock_is_enabled):
    mock_get_id.return_value = "my-reward-id"
    mock_is_enabled.return_value = True

    bot = MagicMock()
    bot.bot_id = "bot123"
    mr_comp = MusicRequest(bot)

    payload = MagicMock()
    payload.id = "redemption-uuid-999"
    payload.broadcaster.id = "12345"
    payload.broadcaster.name = "streamer"
    payload.reward.id = "my-reward-id"
    payload.user.id = "viewer99"
    payload.user.name = "viewer_name"
    payload.user_input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    payload.refund = pytest.importorskip("unittest.mock").AsyncMock()

    await mr_comp.event_custom_redemption_add(payload)

    payload.refund.assert_not_called()
    bot.safe_dispatch.assert_called_once()
    args, kwargs = bot.safe_dispatch.call_args
    assert args[0] == "new_order"
    dispatched_payload: NewOrderPayload = kwargs["payload"]
    assert dispatched_payload.reward_id == "my-reward-id"
    assert dispatched_payload.redemption_id == "redemption-uuid-999"
    assert dispatched_payload.yt_video_url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


@pytest.mark.asyncio
async def test_order_status_handler_refund_cancelled():
    from src.adapters._rabbit import handlers

    bot = MagicMock()
    bot.bot_id = "bot123"
    bot.http.patch_custom_reward_redemption = pytest.importorskip("unittest.mock").AsyncMock()
    partial_user = MagicMock()
    partial_user.send_message = pytest.importorskip("unittest.mock").AsyncMock()
    bot.create_partialuser.return_value = partial_user

    handlers.context["bot"] = bot

    order_update = OrderUpdate(
        order_id=uuid.uuid4(),
        owner_id=uuid.uuid4(),
        owner_platform_id="12345",
        requester_nickname="test_viewer",
        status="cancelled",
        details="Видео находится в черном списке",
        reward_id="reward-123",
        redemption_id="redemption-456",
    )

    msg = MagicMock()
    msg.body = order_update.model_dump_json().encode("utf-8")
    msg.ack = pytest.importorskip("unittest.mock").AsyncMock()

    await handlers.order_status(msg)

    msg.ack.assert_awaited_once()
    bot.http.patch_custom_reward_redemption.assert_awaited_once_with(
        broadcaster_id="12345",
        token_for="12345",
        reward_id="reward-123",
        id="redemption-456",
        status="CANCELED",
    )
    partial_user.send_message.assert_awaited_once()


@pytest.mark.asyncio
async def test_order_status_handler_fulfill_completed():
    from src.adapters._rabbit import handlers

    bot = MagicMock()
    bot.bot_id = "bot123"
    bot.http.patch_custom_reward_redemption = pytest.importorskip("unittest.mock").AsyncMock()
    partial_user = MagicMock()
    partial_user.send_message = pytest.importorskip("unittest.mock").AsyncMock()
    bot.create_partialuser.return_value = partial_user

    handlers.context["bot"] = bot

    order_update = OrderUpdate(
        order_id=uuid.uuid4(),
        owner_id=uuid.uuid4(),
        owner_platform_id="12345",
        requester_nickname="test_viewer",
        status="completed",
        details="Трек успешно добавлен в плейлист",
        reward_id="reward-123",
        redemption_id="redemption-456",
    )

    msg = MagicMock()
    msg.body = order_update.model_dump_json().encode("utf-8")
    msg.ack = pytest.importorskip("unittest.mock").AsyncMock()

    await handlers.order_status(msg)

    msg.ack.assert_awaited_once()
    bot.http.patch_custom_reward_redemption.assert_awaited_once_with(
        broadcaster_id="12345",
        token_for="12345",
        reward_id="reward-123",
        id="redemption-456",
        status="FULFILLED",
    )
    partial_user.send_message.assert_awaited_once()


@pytest.mark.asyncio
@patch("src.components.music_request.get_or_create_channel_reward")
async def test_mr_points_sync(mock_get_or_create):
    mock_get_or_create.return_value = "synced-reward-id"

    bot = MagicMock()
    mr_comp = MusicRequest(bot)

    ctx = MagicMock()
    ctx.channel = MagicMock(id="12345")
    ctx.send = pytest.importorskip("unittest.mock").AsyncMock()

    await mr_comp.mr_points_sync.callback(mr_comp, ctx)

    mock_get_or_create.assert_awaited_once_with(ctx.channel)
    ctx.send.assert_awaited_once_with("Награда за баллы синхронизирована: synced-reward-id")


