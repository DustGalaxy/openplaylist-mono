"""
Comprehensive unit tests for AuthStrategyManager.

Tests cover:
- Strategy registration and retrieval
- Error handling for unimplemented strategies
- Multiple strategy management
"""

from typing import TYPE_CHECKING
import pytest
from unittest.mock import MagicMock, patch


if TYPE_CHECKING:
    from src.services.auth.strategy_manager import AuthStrategyManager
    from src.dto.internal.auth import AuthStrategy
else:
    from services.auth.strategy_manager import AuthStrategyManager
    from dto.internal.auth import AuthStrategy

# ==================== FIXTURES ====================


@pytest.fixture
def strategy_manager():
    """Create a fresh AuthStrategyManager for each test."""
    return AuthStrategyManager()


@pytest.fixture
def mock_auth_strategy():
    """Create a mock AuthStrategy."""
    strategy = MagicMock(spec=AuthStrategy)
    strategy.allow_email_collision = MagicMock(return_value=False)
    strategy.fetch_identity = MagicMock()
    strategy.validate_token = MagicMock()
    return strategy


@pytest.fixture
def mock_twitch_strategy():
    """Create mock Twitch strategy."""
    strategy = MagicMock(spec=AuthStrategy)
    strategy.allow_email_collision = MagicMock(return_value=True)
    strategy.platform_name = "twitch"
    return strategy


@pytest.fixture
def mock_da_strategy():
    """Create mock DA strategy."""
    strategy = MagicMock(spec=AuthStrategy)
    strategy.allow_email_collision = MagicMock(return_value=False)
    strategy.platform_name = "da"
    return strategy


# ==================== REGISTRATION TESTS ====================


class TestStrategyRegistration:
    """Tests for strategy registration."""

    def test_register_decorator_stores_strategy(
        self,
        strategy_manager,
        mock_auth_strategy,
    ):
        """
        GIVEN: A strategy class and a manager
        WHEN: register decorator is applied
        THEN: Strategy instance is stored in registry
        """
        # Arrange
        mark = "test_platform"

        @strategy_manager.register(mark)
        class TestStrategy:
            pass

        # Assert
        assert mark in strategy_manager._registry
        assert strategy_manager._registry[mark] is not None

    def test_register_decorator_passes_kwargs_to_strategy(
        self,
        strategy_manager,
    ):
        """
        GIVEN: register decorator with kwargs
        WHEN: Strategy class is registered
        THEN: Kwargs are passed to strategy constructor
        """
        # Arrange
        mark = "test_platform"
        test_arg = "test_value"

        class MockStrategy:
            def __init__(self, queue=None):
                self.queue = queue

        # Act
        strategy_manager.register(mark, queue=test_arg)(MockStrategy)

        # Assert
        registered_strategy = strategy_manager._registry[mark]
        assert registered_strategy.queue == test_arg

    def test_add_strategy_directly(
        self,
        strategy_manager,
        mock_auth_strategy,
    ):
        """
        GIVEN: Manager and strategy instance
        WHEN: add_strategy is called
        THEN: Strategy is stored in registry
        """
        # Arrange
        mark = "direct_platform"

        # Act
        strategy_manager.add_strategy(mark, mock_auth_strategy)

        # Assert
        assert strategy_manager._registry[mark] == mock_auth_strategy

    def test_add_strategy_overwrites_existing(
        self,
        strategy_manager,
        mock_auth_strategy,
        mock_twitch_strategy,
    ):
        """
        GIVEN: Manager with existing strategy
        WHEN: add_strategy is called with same mark
        THEN: Existing strategy is overwritten
        """
        # Arrange
        mark = "platform"
        strategy_manager.add_strategy(mark, mock_auth_strategy)

        # Act
        strategy_manager.add_strategy(mark, mock_twitch_strategy)

        # Assert
        assert strategy_manager._registry[mark] == mock_twitch_strategy

    def test_multiple_strategies_registered(
        self,
        strategy_manager,
        mock_twitch_strategy,
        mock_da_strategy,
    ):
        """
        GIVEN: Manager with multiple strategies
        WHEN: Multiple strategies are added
        THEN: All strategies are stored correctly
        """
        # Arrange & Act
        strategy_manager.add_strategy("twitch", mock_twitch_strategy)
        strategy_manager.add_strategy("da", mock_da_strategy)

        # Assert
        assert len(strategy_manager._registry) == 2
        assert strategy_manager._registry["twitch"] == mock_twitch_strategy
        assert strategy_manager._registry["da"] == mock_da_strategy


# ==================== RETRIEVAL TESTS ====================


class TestStrategyRetrieval:
    """Tests for strategy retrieval."""

    def test_get_strategy_returns_registered_strategy(
        self,
        strategy_manager,
        mock_auth_strategy,
    ):
        """
        GIVEN: Registered strategy in manager
        WHEN: get_strategy is called with correct mark
        THEN: Strategy instance is returned
        """
        # Arrange
        mark = "test_platform"
        strategy_manager.add_strategy(mark, mock_auth_strategy)

        # Act
        retrieved = strategy_manager.get_strategy(mark)

        # Assert
        assert retrieved == mock_auth_strategy

    def test_get_strategy_raises_error_for_unimplemented(
        self,
        strategy_manager,
    ):
        """
        GIVEN: Manager without strategy
        WHEN: get_strategy is called with unimplemented mark
        THEN: NotImplementedError is raised
        """
        # Act & Assert
        with pytest.raises(NotImplementedError) as exc_info:
            strategy_manager.get_strategy("nonexistent")

        assert "nonexistent" in str(exc_info.value)
        assert "not implemented" in str(exc_info.value).lower()

    def test_get_strategy_returns_correct_strategy_from_multiple(
        self,
        strategy_manager,
        mock_twitch_strategy,
        mock_da_strategy,
        mock_auth_strategy,
    ):
        """
        GIVEN: Manager with multiple registered strategies
        WHEN: get_strategy is called for specific strategy
        THEN: Correct strategy is returned
        """
        # Arrange
        strategy_manager.add_strategy("twitch", mock_twitch_strategy)
        strategy_manager.add_strategy("da", mock_da_strategy)
        strategy_manager.add_strategy("custom", mock_auth_strategy)

        # Act
        result_da = strategy_manager.get_strategy("da")
        result_twitch = strategy_manager.get_strategy("twitch")
        result_custom = strategy_manager.get_strategy("custom")

        # Assert
        assert result_da == mock_da_strategy
        assert result_twitch == mock_twitch_strategy
        assert result_custom == mock_auth_strategy


# ==================== EDGE CASES ====================


class TestStrategyManagerEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_get_strategy_with_empty_string(
        self,
        strategy_manager,
    ):
        """
        GIVEN: Manager with strategies
        WHEN: get_strategy is called with empty string
        THEN: NotImplementedError is raised
        """
        # Act & Assert
        with pytest.raises(NotImplementedError):
            strategy_manager.get_strategy("")

    def test_get_strategy_with_none(
        self,
        strategy_manager,
    ):
        """
        GIVEN: Manager with strategies
        WHEN: get_strategy is called with None
        THEN: NotImplementedError is raised
        """
        # Act & Assert
        with pytest.raises(NotImplementedError):
            strategy_manager.get_strategy(None)

    def test_registry_is_independent_per_instance(
        self,
        mock_auth_strategy,
    ):
        """
        GIVEN: Two different manager instances
        WHEN: Strategy is added to one manager
        THEN: Other manager's registry is not affected
        """
        # Arrange
        manager1 = AuthStrategyManager()
        manager2 = AuthStrategyManager()

        # Act
        manager1.add_strategy("test", mock_auth_strategy)

        # Assert
        assert "test" in manager1._registry
        assert "test" not in manager2._registry

    def test_register_decorator_returns_strategy_class(
        self,
        strategy_manager,
    ):
        """
        GIVEN: Strategy class with register decorator
        WHEN: Decorator is applied
        THEN: Original class is returned (decorator is transparent)
        """

        # Arrange & Act
        @strategy_manager.register("test")
        class TestStrategy:
            pass

        returned_class = TestStrategy

        # Assert
        assert returned_class.__name__ == "TestStrategy"
        assert isinstance(returned_class, type)

    def test_case_sensitivity_in_strategy_marks(
        self,
        strategy_manager,
        mock_twitch_strategy,
        mock_da_strategy,
    ):
        """
        GIVEN: Strategies with similar but different marks
        WHEN: Strategies are stored and retrieved
        THEN: Case sensitivity is preserved
        """
        # Arrange & Act
        strategy_manager.add_strategy("Twitch", mock_twitch_strategy)
        strategy_manager.add_strategy("twitch", mock_da_strategy)

        # Assert
        assert strategy_manager.get_strategy("Twitch") == mock_twitch_strategy
        assert strategy_manager.get_strategy("twitch") == mock_da_strategy


# ==================== PARAMETRIZED TESTS ====================


class TestStrategyManagerParametrized:
    """Parametrized tests for strategy manager."""

    @pytest.mark.parametrize(
        "mark,name",
        [
            ("twitch", "Twitch Platform"),
            ("da", "DA Platform"),
            ("discord", "Discord Integration"),
            ("youtube", "YouTube Integration"),
            ("platform_123", "Custom Platform"),
        ],
    )
    def test_register_various_platform_marks(
        self,
        strategy_manager,
        mark,
        name,
    ):
        """
        GIVEN: Various platform marks
        WHEN: Strategies are registered
        THEN: All marks are handled correctly
        """
        # Arrange
        mock_strategy = MagicMock(spec=AuthStrategy)

        # Act
        strategy_manager.add_strategy(mark, mock_strategy)

        # Assert
        assert strategy_manager.get_strategy(mark) == mock_strategy

    @pytest.mark.parametrize(
        "marks",
        [
            ["platform1", "platform2"],
            ["twitch", "da", "discord"],
            ["a", "b", "c", "d", "e"],
        ],
    )
    def test_register_multiple_strategies_at_once(
        self,
        strategy_manager,
        marks,
    ):
        """
        GIVEN: Multiple platform marks
        WHEN: Multiple strategies are registered
        THEN: All are retrievable
        """
        # Arrange & Act
        for i, mark in enumerate(marks):
            mock_strategy = MagicMock(spec=AuthStrategy)
            strategy_manager.add_strategy(mark, mock_strategy)

        # Assert
        assert len(strategy_manager._registry) == len(marks)
        for mark in marks:
            assert mark in strategy_manager._registry
