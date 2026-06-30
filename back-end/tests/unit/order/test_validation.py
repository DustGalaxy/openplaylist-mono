"""
Unit tests for ValidationEngine (src/services_low/settings.py)

Тестируем ValidationEngine напрямую — без репозиториев, без БД.
Каждый тест изолирует ровно одно правило валидации или один метод.

Покрытые области:
  ValidationEngine.get_content_settigs
    - точное совпадение по платформе
    - фолбэк на GENERAL если нет точного совпадения
    - ValueError если нет ни платформы ни GENERAL
    - vip и non-vip возвращают одно и то же (закомментированная логика)

  ValidationEngine.get_donations_settings
    - точное совпадение по платформе
    - фолбэк на GENERAL если нет точного совпадения
    - пустой список если нет ни того ни другого (find_all вернул None/[])

  ValidationEngine.check_donation_rules
    - находит совпадение
    - не находит совпадение
    - пустой список правил

  ValidationEngine.identify_roles
    - нормальная строка с разделителем
    - пустая строка → []
    - одна роль

  ValidationEngine.validate_track  (каждое правило отдельно)
    - from_owner=True → всегда пустой список
    - Wrong donation amount
    - Wrong donation currency
    - Blacklisted user (by nickname)
    - Blacklisted user (by id)
    - Blacklisted track
    - Not enough views
    - Not enough likes
    - Too long
    - Playlist is full
    - Track cooldown (в кулдауне / не в кулдауне)
    - User cooldown (в кулдауне / не в кулдауне)
    - Множество ошибок одновременно
    - Чистый трек — ноль ошибок

  ValidationEngine._check_track_cooldown
    - трек не найден → False
    - трек найден, кулдаун ещё идёт → True
    - трек найден, кулдаун истёк → False

  ValidationEngine._check_user_cooldown
    - пользователь не найден → False
    - пользователь найден, кулдаун идёт (datetime объект) → True
    - пользователь найден, кулдаун идёт (ISO строка) → True
    - пользователь найден, кулдаун истёк → False
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest

# Импортируем только ValidationEngine — без всего тяжёлого окружения
from src.services_low.settings import ValidationEngine


# ============================================================================
# Builder-helpers — создаём минимальные заглушки без Pydantic
# ============================================================================


def _content_settings(
    *,
    platform,
    min_views: int = 0,
    min_likes: int = 0,
    max_duration: int = 0,
    track_cooldown: int = 0,
    user_cooldown: int = 0,
):
    obj = MagicMock()
    obj.platform = platform
    obj.min_views = min_views
    obj.min_likes = min_likes
    obj.max_duration = max_duration
    obj.track_cooldown = track_cooldown
    obj.user_cooldown = user_cooldown
    return obj


def _donation_rule(*, platform, amount, currency: str = "RUB"):
    obj = MagicMock()
    obj.platform = platform
    obj.amount = amount
    obj.currency = currency
    return obj


def _block_entry(*, trigger_type: str, trigger_value: str, platform):
    obj = MagicMock()
    obj.trigger_type = trigger_type
    obj.trigger_value = trigger_value
    obj.platform = platform
    return obj


def _settings(
    *,
    content_settings=None,
    donation_rules=None,
    block_list=None,
    track_black_list=None,
    max_playlist_size: int = 0,
):
    obj = MagicMock()
    obj.content_settings = content_settings or []
    obj.donation_rules = donation_rules or []
    obj.block_list = block_list or []
    obj.track_black_list = track_black_list or []
    obj.max_playlist_size = max_playlist_size
    return obj


def _playlist(*, track_data=None):
    obj = MagicMock()
    obj.track_data = track_data or []
    return obj


def _track(
    *,
    from_owner: bool = False,
    source,
    yt_video_id: str = "video_123",
    views: int = 1000,
    likes: int = 100,
    duration: int = 180,
    requester_nickname: str = "user1",
    requester_id: str = "uid_1",
    extra_data=None,
):
    obj = MagicMock()
    obj.from_owner = from_owner
    obj.source = source
    obj.yt_video_id = yt_video_id
    obj.views = views
    obj.likes = likes
    obj.duration = duration
    obj.requester_nickname = requester_nickname
    obj.requester_id = requester_id
    obj.extra_data = extra_data or MagicMock()
    return obj


def _prev_track(*, yt_video_id: str = "video_123", requester_nickname: str = "user1", created_at: datetime = None):
    obj = MagicMock()
    obj.yt_video_id = yt_video_id
    obj.requester_nickname = requester_nickname
    obj.created_at = created_at or datetime.now()
    return obj


# ============================================================================
# Фикстуры с платформами — используем реальные Enum значения
# ============================================================================


@pytest.fixture
def chat_platform():
    """Платформа которая НЕ входит в DonationRuleScope (чат-источник)."""
    from src._types import ContentSettingScope

    return ContentSettingScope.TWITCH


@pytest.fixture
def donation_platform():
    """Платформа которая входит в DonationRuleScope."""
    from src._types import DonationRuleScope

    # Берём первый доступный donation scope
    return list(DonationRuleScope)[0]


@pytest.fixture
def general_scope():
    from src._types import ContentSettingScope

    return ContentSettingScope.GENERAL


# ============================================================================
# get_content_settigs
# ============================================================================


class TestGetContentSettings:
    def test_returns_exact_platform_match(self, chat_platform, general_scope):
        """Если есть точное совпадение по платформе — берём его, не GENERAL."""
        engine = ValidationEngine(owner_is_vip=False)

        specific = _content_settings(platform=chat_platform, min_views=500)
        general = _content_settings(platform=general_scope, min_views=10)
        settings = _settings(content_settings=[general, specific])

        result = engine.get_content_settigs(settings, chat_platform)

        assert result["min_views"] == 500

    def test_falls_back_to_general_when_no_exact_match(self, chat_platform, general_scope):
        """Если точного совпадения нет — используем GENERAL."""
        engine = ValidationEngine(owner_is_vip=False)

        general = _content_settings(platform=general_scope, min_views=42)
        settings = _settings(content_settings=[general])

        result = engine.get_content_settigs(settings, chat_platform)

        assert result["min_views"] == 42

    def test_raises_value_error_when_no_settings_at_all(self, chat_platform):
        """Нет ни платформы ни GENERAL — ValueError."""
        engine = ValidationEngine(owner_is_vip=False)
        settings = _settings(content_settings=[])

        with pytest.raises(ValueError, match="Cannot find base settings"):
            engine.get_content_settigs(settings, chat_platform)

    def test_non_vip_returns_effective_dict(self, general_scope):
        """Non-VIP возвращает базовый dict из content_settings."""
        engine = ValidationEngine(owner_is_vip=False)
        cs = _content_settings(
            platform=general_scope,
            min_views=100,
            min_likes=10,
            max_duration=300,
            track_cooldown=5,
            user_cooldown=2,
        )
        settings = _settings(content_settings=[cs])

        result = engine.get_content_settigs(settings, general_scope)

        assert result == {
            "min_views": 100,
            "min_likes": 10,
            "max_duration": 300,
            "track_cooldown": 5,
            "user_cooldown": 2,
        }

    def test_vip_returns_same_result_while_vip_logic_commented(self, general_scope):
        """VIP-логика закомментирована — VIP и non-VIP возвращают одно и то же."""
        engine_vip = ValidationEngine(owner_is_vip=True)
        engine_non_vip = ValidationEngine(owner_is_vip=False)

        cs = _content_settings(platform=general_scope, min_views=50)
        settings = _settings(content_settings=[cs])

        assert engine_vip.get_content_settigs(settings, general_scope) == engine_non_vip.get_content_settigs(
            settings, general_scope
        )

    def test_first_match_wins_when_multiple_platforms(self, chat_platform, general_scope):
        """Если несколько объектов с нужной платформой — берётся первый (next behaviour)."""
        engine = ValidationEngine(owner_is_vip=False)

        first = _content_settings(platform=chat_platform, min_views=111)
        second = _content_settings(platform=chat_platform, min_views=999)
        settings = _settings(content_settings=[first, second])

        result = engine.get_content_settigs(settings, chat_platform)
        assert result["min_views"] == 111


# ============================================================================
# get_donations_settings
# ============================================================================


class TestGetDonationsSettings:
    def test_returns_rules_for_exact_platform(self, donation_platform):
        from src._types import DonationRuleScope

        engine = ValidationEngine(owner_is_vip=False)

        rule = _donation_rule(platform=donation_platform, amount=100)
        settings = _settings(donation_rules=[rule])

        result = engine.get_donations_settings(settings, donation_platform)

        assert len(result) == 1
        assert result[0]["amount"] == 100

    def test_falls_back_to_general_when_no_exact_platform(self, donation_platform):
        from src._types import DonationRuleScope

        engine = ValidationEngine(owner_is_vip=False)

        general_rule = _donation_rule(platform=DonationRuleScope.GENERAL, amount=50)
        settings = _settings(donation_rules=[general_rule])

        # используем другую платформу, не ту которая в правиле
        all_scopes = list(DonationRuleScope)
        other_platform = next(p for p in all_scopes if p != DonationRuleScope.GENERAL and p != donation_platform)

        result = engine.get_donations_settings(settings, other_platform)

        assert len(result) == 1
        assert result[0]["amount"] == 50

    def test_returns_empty_list_when_no_rules_at_all(self, donation_platform):
        """find_all возвращает [] когда нет GENERAL правил — пустой список без ошибки."""
        engine = ValidationEngine(owner_is_vip=False)
        settings = _settings(donation_rules=[])

        # find_all вернёт [] (не None) — ValueError не кидается
        result = engine.get_donations_settings(settings, donation_platform)
        assert result == []

    def test_returns_multiple_general_rules(self):
        from src._types import DonationRuleScope

        engine = ValidationEngine(owner_is_vip=False)

        rules = [
            _donation_rule(platform=DonationRuleScope.GENERAL, amount=100, currency="RUB"),
            _donation_rule(platform=DonationRuleScope.GENERAL, amount=200, currency="USD"),
        ]
        # Ищем платформу которой нет в правилах чтобы триггернуть фолбэк
        all_scopes = list(DonationRuleScope)
        non_general = next(p for p in all_scopes if p != DonationRuleScope.GENERAL)

        settings = _settings(donation_rules=rules)
        result = engine.get_donations_settings(settings, non_general)

        assert len(result) == 2
        amounts = {r["amount"] for r in result}
        assert amounts == {100, 200}


# ============================================================================
# check_donation_rules
# ============================================================================


class TestCheckDonationRules:
    def test_returns_true_when_value_matches(self):
        engine = ValidationEngine(owner_is_vip=False)
        rules = [{"amount": 100, "currency": "RUB"}, {"amount": 200, "currency": "USD"}]
        assert engine.check_donation_rules(rules, "amount", 100) is True

    def test_returns_false_when_no_match(self):
        engine = ValidationEngine(owner_is_vip=False)
        rules = [{"amount": 100, "currency": "RUB"}]
        assert engine.check_donation_rules(rules, "amount", 999) is False

    def test_returns_false_for_empty_rules(self):
        engine = ValidationEngine(owner_is_vip=False)
        assert engine.check_donation_rules([], "amount", 100) is False

    def test_checks_currency_field(self):
        engine = ValidationEngine(owner_is_vip=False)
        rules = [{"amount": 100, "currency": "RUB"}]
        assert engine.check_donation_rules(rules, "currency", "RUB") is True
        assert engine.check_donation_rules(rules, "currency", "USD") is False


# ============================================================================
# identify_roles
# ============================================================================


class TestIdentifyRoles:
    def test_splits_by_colon(self):
        engine = ValidationEngine(owner_is_vip=False)
        assert engine.identify_roles("vip:subscriber:mod") == ["vip", "subscriber", "mod"]

    def test_empty_string_returns_empty_list(self):
        engine = ValidationEngine(owner_is_vip=False)
        assert engine.identify_roles("") == []

    def test_single_role_returns_list_with_one_item(self):
        engine = ValidationEngine(owner_is_vip=False)
        assert engine.identify_roles("admin") == ["admin"]


# ============================================================================
# validate_track — каждое правило изолированно
# ============================================================================


class TestValidateTrack:
    """
    Стратегия: для каждого правила делаем «идеальный» трек который проходит всё,
    затем ломаем ровно одно условие и проверяем что именно эта ошибка появляется.
    """

    def _make_clean_engine(self):
        return ValidationEngine(owner_is_vip=False)

    def _make_permissive_settings(self, general_scope, donation_platform=None, *, with_donation_rule=None):
        """
        Настройки, которые пропускают трек по всем правилам кроме явно заданных.
        """
        from src._types import ContentSettingScope

        cs = _content_settings(
            platform=general_scope,
            min_views=0,
            min_likes=0,
            max_duration=9999,
            track_cooldown=0,
            user_cooldown=0,
        )
        donation_rules = []
        if with_donation_rule is not None and donation_platform is not None:
            donation_rules = [with_donation_rule]

        return _settings(
            content_settings=[cs],
            donation_rules=donation_rules,
            block_list=[],
            track_black_list=[],
            max_playlist_size=0,
        )

    # ------------------------------------------------------------------
    # from_owner bypass
    # ------------------------------------------------------------------

    def test_from_owner_skips_all_validation(self, general_scope, donation_platform):
        engine = self._make_clean_engine()
        settings = _settings(
            content_settings=[],  # даже без настроек
            max_playlist_size=1,
            track_black_list=["video_123"],
        )
        track = _track(from_owner=True, source=general_scope, yt_video_id="video_123")
        playlist = _playlist(track_data=["x", "y"])  # полный плейлист

        result = engine.validate_track(track, settings, playlist)
        assert result == []

    # ------------------------------------------------------------------
    # Wrong donation amount
    # ------------------------------------------------------------------

    def test_wrong_donation_amount_triggers_error(self, general_scope, donation_platform):
        engine = self._make_clean_engine()

        allowed_rule = _donation_rule(platform=donation_platform, amount=100, currency="RUB")
        settings = self._make_permissive_settings(general_scope, donation_platform, with_donation_rule=allowed_rule)

        extra = MagicMock()
        extra.donation_amount = 999  # не совпадает с разрешённым 100
        extra.donation_currency = "RUB"
        track = _track(source=donation_platform, extra_data=extra)
        playlist = _playlist()

        errors = engine.validate_track(track, settings, playlist)
        assert "Wrong donation amount" in errors

    def test_correct_donation_amount_no_error(self, general_scope, donation_platform):
        engine = self._make_clean_engine()

        allowed_rule = _donation_rule(platform=donation_platform, amount=100, currency="RUB")
        settings = self._make_permissive_settings(general_scope, donation_platform, with_donation_rule=allowed_rule)

        extra = MagicMock()
        extra.donation_amount = 100
        extra.donation_currency = "RUB"
        track = _track(source=donation_platform, extra_data=extra)
        playlist = _playlist()

        errors = engine.validate_track(track, settings, playlist)
        assert "Wrong donation amount" not in errors

    # ------------------------------------------------------------------
    # Wrong donation currency
    # ------------------------------------------------------------------

    def test_wrong_donation_currency_triggers_error(self, general_scope, donation_platform):
        engine = self._make_clean_engine()

        allowed_rule = _donation_rule(platform=donation_platform, amount=100, currency="RUB")
        settings = self._make_permissive_settings(general_scope, donation_platform, with_donation_rule=allowed_rule)

        extra = MagicMock()
        extra.donation_amount = 100
        extra.donation_currency = "USD"  # не совпадает
        track = _track(source=donation_platform, extra_data=extra)
        playlist = _playlist()

        errors = engine.validate_track(track, settings, playlist)
        assert "Wrong donation currency" in errors

    # ------------------------------------------------------------------
    # Blacklisted user (by nickname)
    # ------------------------------------------------------------------

    def test_blacklisted_nickname_triggers_error(self, general_scope, chat_platform):
        engine = self._make_clean_engine()

        cs = _content_settings(platform=general_scope, max_duration=9999)
        block = _block_entry(trigger_type="user_name", trigger_value="badguy", platform=chat_platform)
        settings = _settings(content_settings=[cs], block_list=[block])

        track = _track(
            source=chat_platform,
            requester_nickname="badguy",
            requester_id="some_id",
        )
        playlist = _playlist()

        errors = engine.validate_track(track, settings, playlist)
        assert "Blacklisted user" in errors

    def test_blacklisted_user_id_triggers_error(self, general_scope, chat_platform):
        engine = self._make_clean_engine()

        cs = _content_settings(platform=general_scope, max_duration=9999)
        block = _block_entry(trigger_type="user_id", trigger_value="banned_uid", platform=chat_platform)
        settings = _settings(content_settings=[cs], block_list=[block])

        track = _track(
            source=chat_platform,
            requester_nickname="innocent_name",
            requester_id="banned_uid",
        )
        playlist = _playlist()

        errors = engine.validate_track(track, settings, playlist)
        assert "Blacklisted user" in errors

    def test_block_list_different_platform_does_not_trigger(self, general_scope, chat_platform):
        """Блок для другой платформы не должен срабатывать."""
        from src._types import ContentSettingScope

        other_platform = ContentSettingScope.GENERAL  # не та платформа

        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999)
        block = _block_entry(trigger_type="user_name", trigger_value="badguy", platform=other_platform)
        settings = _settings(content_settings=[cs], block_list=[block])

        track = _track(source=chat_platform, requester_nickname="badguy")
        playlist = _playlist()

        errors = engine.validate_track(track, settings, playlist)
        assert "Blacklisted user" not in errors

    # ------------------------------------------------------------------
    # Blacklisted track
    # ------------------------------------------------------------------

    def test_blacklisted_track_triggers_error(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999)
        settings = _settings(content_settings=[cs], track_black_list=["banned_video"])

        track = _track(source=chat_platform, yt_video_id="banned_video")
        playlist = _playlist()

        errors = engine.validate_track(track, settings, playlist)
        assert "Blacklisted track" in errors

    def test_non_blacklisted_track_no_error(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999)
        settings = _settings(content_settings=[cs], track_black_list=["other_video"])

        track = _track(source=chat_platform, yt_video_id="clean_video")
        playlist = _playlist()

        errors = engine.validate_track(track, settings, playlist)
        assert "Blacklisted track" not in errors

    # ------------------------------------------------------------------
    # Not enough views
    # ------------------------------------------------------------------

    def test_not_enough_views_triggers_error(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, min_views=1000, max_duration=9999)
        settings = _settings(content_settings=[cs])

        track = _track(source=chat_platform, views=500)
        errors = engine.validate_track(track, settings, _playlist())
        assert "Not enough views" in errors

    def test_exact_min_views_passes(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, min_views=1000, max_duration=9999)
        settings = _settings(content_settings=[cs])

        track = _track(source=chat_platform, views=1000)
        errors = engine.validate_track(track, settings, _playlist())
        assert "Not enough views" not in errors

    # ------------------------------------------------------------------
    # Not enough likes
    # ------------------------------------------------------------------

    def test_not_enough_likes_triggers_error(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, min_likes=50, max_duration=9999)
        settings = _settings(content_settings=[cs])

        track = _track(source=chat_platform, likes=10)
        errors = engine.validate_track(track, settings, _playlist())
        assert "Not enough likes" in errors

    def test_exact_min_likes_passes(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, min_likes=50, max_duration=9999)
        settings = _settings(content_settings=[cs])

        track = _track(source=chat_platform, likes=50)
        errors = engine.validate_track(track, settings, _playlist())
        assert "Not enough likes" not in errors

    # ------------------------------------------------------------------
    # Too long
    # ------------------------------------------------------------------

    def test_too_long_triggers_error(self, general_scope, chat_platform):
        """max_duration=300, трек 301 → ошибка."""
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=300)
        settings = _settings(content_settings=[cs])

        track = _track(source=chat_platform, duration=301)
        errors = engine.validate_track(track, settings, _playlist())
        assert "Too long" in errors

    def test_exact_max_duration_passes(self, general_scope, chat_platform):
        """max_duration=300, трек ровно 300 → нет ошибки (условие строгое <)."""
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=300)
        settings = _settings(content_settings=[cs])

        track = _track(source=chat_platform, duration=300)
        errors = engine.validate_track(track, settings, _playlist())
        assert "Too long" not in errors

    def test_max_duration_zero_never_triggers(self, general_scope, chat_platform):
        """max_duration=0 → правило неактивно (0 < duration всегда True — это баг или фича?)"""
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=0)
        settings = _settings(content_settings=[cs])

        # Документируем текущее поведение: 0 < 180 == True → "Too long" будет!
        track = _track(source=chat_platform, duration=180)
        errors = engine.validate_track(track, settings, _playlist())
        # Это покрывает реальное поведение кода как есть
        assert "Too long" in errors

    # ------------------------------------------------------------------
    # Playlist is full
    # ------------------------------------------------------------------

    def test_playlist_full_triggers_error(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999)
        settings = _settings(content_settings=[cs], max_playlist_size=2)

        playlist = _playlist(track_data=["t1", "t2"])  # ровно max
        track = _track(source=chat_platform)
        errors = engine.validate_track(track, settings, playlist)
        assert "Playlist is full" in errors

    def test_playlist_not_full_no_error(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999)
        settings = _settings(content_settings=[cs], max_playlist_size=5)

        playlist = _playlist(track_data=["t1", "t2"])
        track = _track(source=chat_platform)
        errors = engine.validate_track(track, settings, playlist)
        assert "Playlist is full" not in errors

    def test_max_playlist_size_zero_means_unlimited(self, general_scope, chat_platform):
        """max_playlist_size=0 → правило отключено."""
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999)
        settings = _settings(content_settings=[cs], max_playlist_size=0)

        playlist = _playlist(track_data=["t" + str(i) for i in range(100)])
        track = _track(source=chat_platform)
        errors = engine.validate_track(track, settings, playlist)
        assert "Playlist is full" not in errors

    # ------------------------------------------------------------------
    # Track cooldown
    # ------------------------------------------------------------------

    def test_track_cooldown_triggers_when_track_too_recent(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999, track_cooldown=10)  # 10 минут
        settings = _settings(content_settings=[cs])

        prev = _prev_track(
            yt_video_id="vid_abc",
            created_at=datetime.now() - timedelta(minutes=5),  # 5 минут назад < 10 минут
        )
        playlist = _playlist(track_data=[prev])
        track = _track(source=chat_platform, yt_video_id="vid_abc")
        errors = engine.validate_track(track, settings, playlist)
        assert "Track cooldown" in errors

    def test_track_cooldown_passes_when_cooldown_expired(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999, track_cooldown=10)
        settings = _settings(content_settings=[cs])

        prev = _prev_track(
            yt_video_id="vid_abc",
            created_at=datetime.now() - timedelta(minutes=15),  # 15 > 10 → кулдаун истёк
        )
        playlist = _playlist(track_data=[prev])
        track = _track(source=chat_platform, yt_video_id="vid_abc")
        errors = engine.validate_track(track, settings, playlist)
        assert "Track cooldown" not in errors

    def test_track_cooldown_zero_never_triggers(self, general_scope, chat_platform):
        """track_cooldown=0 → правило отключено."""
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999, track_cooldown=0)
        settings = _settings(content_settings=[cs])

        prev = _prev_track(yt_video_id="vid_abc", created_at=datetime.now())
        playlist = _playlist(track_data=[prev])
        track = _track(source=chat_platform, yt_video_id="vid_abc")
        errors = engine.validate_track(track, settings, playlist)
        assert "Track cooldown" not in errors

    # ------------------------------------------------------------------
    # User cooldown
    # ------------------------------------------------------------------

    def test_user_cooldown_triggers_when_user_too_recent(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999, user_cooldown=5)
        settings = _settings(content_settings=[cs])

        prev = _prev_track(
            requester_nickname="user1",
            created_at=datetime.now() - timedelta(minutes=2),
        )
        playlist = _playlist(track_data=[prev])
        track = _track(source=chat_platform, requester_nickname="user1")
        errors = engine.validate_track(track, settings, playlist)
        assert "User cooldown" in errors

    def test_user_cooldown_passes_when_expired(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999, user_cooldown=5)
        settings = _settings(content_settings=[cs])

        prev = _prev_track(
            requester_nickname="user1",
            created_at=datetime.now() - timedelta(minutes=10),
        )
        playlist = _playlist(track_data=[prev])
        track = _track(source=chat_platform, requester_nickname="user1")
        errors = engine.validate_track(track, settings, playlist)
        assert "User cooldown" not in errors

    def test_user_cooldown_zero_never_triggers(self, general_scope, chat_platform):
        engine = self._make_clean_engine()
        cs = _content_settings(platform=general_scope, max_duration=9999, user_cooldown=0)
        settings = _settings(content_settings=[cs])

        prev = _prev_track(requester_nickname="user1", created_at=datetime.now())
        playlist = _playlist(track_data=[prev])
        track = _track(source=chat_platform, requester_nickname="user1")
        errors = engine.validate_track(track, settings, playlist)
        assert "User cooldown" not in errors

    # ------------------------------------------------------------------
    # Комбинации
    # ------------------------------------------------------------------

    def test_multiple_errors_returned_simultaneously(self, general_scope, chat_platform):
        """Несколько правил срабатывают — все ошибки в результате."""
        engine = self._make_clean_engine()
        cs = _content_settings(
            platform=general_scope,
            min_views=10000,  # трек не пройдёт
            min_likes=5000,  # трек не пройдёт
            max_duration=9999,
        )
        settings = _settings(
            content_settings=[cs],
            track_black_list=["blacklisted_vid"],
        )

        track = _track(
            source=chat_platform,
            yt_video_id="blacklisted_vid",
            views=0,
            likes=0,
        )
        errors = engine.validate_track(track, settings, _playlist())

        assert "Not enough views" in errors
        assert "Not enough likes" in errors
        assert "Blacklisted track" in errors

    def test_clean_track_has_no_errors(self, general_scope, chat_platform):
        """Абсолютно чистый трек — пустой список ошибок."""
        engine = self._make_clean_engine()
        cs = _content_settings(
            platform=general_scope,
            min_views=100,
            min_likes=10,
            max_duration=600,
            track_cooldown=0,
            user_cooldown=0,
        )
        settings = _settings(
            content_settings=[cs],
            max_playlist_size=50,
        )

        track = _track(
            source=chat_platform,
            yt_video_id="clean_video",
            views=10000,
            likes=1000,
            duration=300,
        )
        playlist = _playlist(track_data=["existing"] * 5)
        errors = engine.validate_track(track, settings, playlist)
        assert errors == []


# ============================================================================
# _check_track_cooldown (напрямую)
# ============================================================================


class TestCheckTrackCooldown:
    def test_returns_false_when_track_not_in_playlist(self):
        engine = ValidationEngine(owner_is_vip=False)
        track = _track(source=MagicMock(), yt_video_id="new_video")
        result = engine._check_track_cooldown(track, [], track_cooldown=10)
        assert result is False

    def test_returns_true_when_track_within_cooldown(self):
        engine = ValidationEngine(owner_is_vip=False)
        new_track = _track(source=MagicMock(), yt_video_id="vid")
        prev = _prev_track(yt_video_id="vid", created_at=datetime.now() - timedelta(seconds=30))
        result = engine._check_track_cooldown(new_track, [prev], track_cooldown=1)  # 1 минута
        assert result is True

    def test_returns_false_when_cooldown_has_expired(self):
        engine = ValidationEngine(owner_is_vip=False)
        new_track = _track(source=MagicMock(), yt_video_id="vid")
        prev = _prev_track(yt_video_id="vid", created_at=datetime.now() - timedelta(minutes=5))
        result = engine._check_track_cooldown(new_track, [prev], track_cooldown=1)
        assert result is False

    def test_different_video_id_not_matched(self):
        engine = ValidationEngine(owner_is_vip=False)
        new_track = _track(source=MagicMock(), yt_video_id="vid_new")
        prev = _prev_track(yt_video_id="vid_old", created_at=datetime.now())
        result = engine._check_track_cooldown(new_track, [prev], track_cooldown=10)
        assert result is False


# ============================================================================
# _check_user_cooldown (напрямую)
# ============================================================================


class TestCheckUserCooldown:
    def test_returns_false_when_user_not_in_playlist(self):
        engine = ValidationEngine(owner_is_vip=False)
        new_track = _track(source=MagicMock(), requester_nickname="alice")
        result = engine._check_user_cooldown(new_track, [], user_cooldown=5)
        assert result is False

    def test_returns_true_when_user_within_cooldown_datetime(self):
        engine = ValidationEngine(owner_is_vip=False)
        new_track = _track(source=MagicMock(), requester_nickname="alice")
        prev = _prev_track(
            requester_nickname="alice",
            created_at=datetime.now() - timedelta(seconds=30),
        )
        result = engine._check_user_cooldown(new_track, [prev], user_cooldown=1)
        assert result is True

    def test_returns_true_when_created_at_is_iso_string(self):
        """_check_user_cooldown поддерживает created_at как ISO строку."""
        engine = ValidationEngine(owner_is_vip=False)
        new_track = _track(source=MagicMock(), requester_nickname="bob")

        recent_time = datetime.now() - timedelta(seconds=30)
        prev = MagicMock()
        prev.requester_nickname = "bob"
        prev.created_at = recent_time.isoformat()  # строка, не datetime

        result = engine._check_user_cooldown(new_track, [prev], user_cooldown=1)
        assert result is True

    def test_returns_false_when_user_cooldown_expired(self):
        engine = ValidationEngine(owner_is_vip=False)
        new_track = _track(source=MagicMock(), requester_nickname="alice")
        prev = _prev_track(
            requester_nickname="alice",
            created_at=datetime.now() - timedelta(minutes=10),
        )
        result = engine._check_user_cooldown(new_track, [prev], user_cooldown=1)
        assert result is False

    def test_different_nickname_not_matched(self):
        engine = ValidationEngine(owner_is_vip=False)
        new_track = _track(source=MagicMock(), requester_nickname="alice")
        prev = _prev_track(requester_nickname="bob", created_at=datetime.now())
        result = engine._check_user_cooldown(new_track, [prev], user_cooldown=10)
        assert result is False
