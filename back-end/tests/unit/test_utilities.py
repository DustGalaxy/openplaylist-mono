"""
Comprehensive tests for utility functions and helpers.

Tests cover:
- Common utility functions
- Type validation
- Data transformation
- Edge cases
"""

import pytest
from typing import List, TYPE_CHECKING
from uuid import UUID
from unittest.mock import MagicMock

if TYPE_CHECKING:
    from src.utils import find
    from src._types import Platform
else:
    from utils import find
    from _types import Platform



# ==================== FIND UTILITY TESTS ====================


class TestFindUtility:
    """Tests for the find utility function."""

    def test_find_returns_matching_element(self):
        """
        GIVEN: List of items and a predicate
        WHEN: find is called
        THEN: First matching item is returned
        """
        # Arrange
        items = [
            {"id": 1, "name": "item1"},
            {"id": 2, "name": "item2"},
            {"id": 3, "name": "item3"},
        ]

        # Act
        result = find(items, lambda x: x["id"] == 2)

        # Assert
        assert result is not None
        assert result["name"] == "item2"

    def test_find_returns_first_match(self):
        """
        GIVEN: List with multiple matching items
        WHEN: find is called
        THEN: First matching item is returned
        """
        # Arrange
        items = [
            {"status": "active", "order": 1},
            {"status": "active", "order": 2},
            {"status": "active", "order": 3},
        ]

        # Act
        result = find(items, lambda x: x["status"] == "active")

        # Assert
        assert result is not None
        assert result.get("order") == 1

    def test_find_returns_none_when_no_match(self):
        """
        GIVEN: List with no matching items
        WHEN: find is called
        THEN: None is returned
        """
        # Arrange
        items = [1, 2, 3, 4, 5]

        # Act
        result = find(items, lambda x: x > 10)

        # Assert
        assert result is None

    def test_find_with_empty_list(self):
        """
        GIVEN: Empty list
        WHEN: find is called
        THEN: None is returned
        """
        # Arrange
        items = []

        # Act
        result = find(items, lambda x: True)

        # Assert
        assert result is None

    def test_find_with_complex_predicate(self):
        """
        GIVEN: List of objects and complex predicate
        WHEN: find is called
        THEN: Correct item matching predicate is returned
        """
        # Arrange
        items = [
            MagicMock(platform="twitch", id="123"),
            MagicMock(platform="da", id="456"),
            MagicMock(platform="youtube", id="789"),
        ]

        # Act
        result = find(items, lambda x: x.platform == "da")

        # Assert
        assert result is not None
        assert result.platform == "da"

    def test_find_with_object_matching(self):
        """
        GIVEN: List of objects with attributes
        WHEN: find is called with attribute matching
        THEN: Correct object is returned
        """
        # Arrange
        obj1 = MagicMock()
        obj1.status = "pending"
        obj1.priority = "high"
        
        obj2 = MagicMock()
        obj2.status = "completed"
        obj2.priority = "low"
        
        items = [obj1, obj2]

        # Act
        result = find(items, lambda x: x.priority == "low")

        # Assert
        assert result == obj2


# ==================== PLATFORM TYPE TESTS ====================


class TestPlatformType:
    """Tests for Platform enum type."""

    def test_platform_twitch_exists(self):
        """
        GIVEN: Platform enum
        WHEN: Checking TWITCH platform
        THEN: TWITCH platform exists
        """
        # Assert
        assert hasattr(Platform, "TWITCH")
        assert Platform.TWITCH is not None

    def test_platform_da_exists(self):
        """
        GIVEN: Platform enum
        WHEN: Checking DA platform
        THEN: DA platform exists
        """
        # Assert
        assert hasattr(Platform, "DA")
        assert Platform.DA is not None

    def test_platform_values_are_unique(self):
        """
        GIVEN: Platform enum
        WHEN: Comparing all platform values
        THEN: All platform values are unique
        """
        # Arrange
        platforms = [
            Platform.TWITCH,
            Platform.DA,
        ]

        # Assert
        assert len(platforms) == len(set(platforms))

    @pytest.mark.parametrize("platform", [
        Platform.TWITCH,
        Platform.DA,
    ])
    def test_platform_can_be_used_in_comparisons(self, platform):
        """
        GIVEN: Platform enum value
        WHEN: Platform is compared
        THEN: Comparison works correctly
        """
        # Assert
        assert platform == platform
        assert platform is not None


# ==================== TYPE CHECKING TESTS ====================


class TestTypeValidation:
    """Tests for type validation and conversion."""

    def test_uuid_string_conversion(self):
        """
        GIVEN: UUID string
        WHEN: Converting to UUID object
        THEN: Conversion is successful
        """
        # Arrange
        uuid_string = "550e8400-e29b-41d4-a716-446655440000"

        # Act
        uuid_obj = UUID(uuid_string)

        # Assert
        assert isinstance(uuid_obj, UUID)
        assert str(uuid_obj) == uuid_string

    def test_uuid_from_integer(self):
        """
        GIVEN: Integer
        WHEN: Creating UUID from integer
        THEN: UUID is created correctly
        """
        # Arrange
        integer_value = 123456789

        # Act
        uuid_obj = UUID(int=integer_value)

        # Assert
        assert isinstance(uuid_obj, UUID)
        assert uuid_obj.int == integer_value


# ==================== EDGE CASES ====================


class TestUtilityEdgeCases:
    """Tests for edge cases in utility functions."""

    def test_find_with_predicate_raising_exception(self):
        """
        GIVEN: Predicate that raises exception
        WHEN: find is called
        THEN: Exception propagates
        """
        # Arrange
        items = [1, 2, 3]

        def bad_predicate(x):
            raise ValueError("Test error")

        # Act & Assert
        with pytest.raises(ValueError):
            find(items, bad_predicate)

    def test_find_with_none_values_in_list(self):
        """
        GIVEN: List containing None values
        WHEN: find is called with predicate handling None
        THEN: None values are handled correctly
        """
        # Arrange
        items = [None, 1, None, 2, None]

        # Act
        result = find(items, lambda x: x is not None and x > 1)

        # Assert
        assert result == 2

    def test_find_with_falsy_values(self):
        """
        GIVEN: List with falsy values
        WHEN: find searches for falsy values
        THEN: Falsy values are found correctly
        """
        # Arrange
        items = [True, False, 1, 0, "text", ""]

        # Act
        result = find(items, lambda x: x is False)

        # Assert
        assert result is False

    def test_find_with_generator_predicate(self):
        """
        GIVEN: Predicate using complex logic
        WHEN: find is called
        THEN: Complex predicate works correctly
        """
        # Arrange
        items = [
            {"x": 1, "y": 2, "z": 3},
            {"x": 4, "y": 5, "z": 6},
            {"x": 7, "y": 8, "z": 9},
        ]

        def complex_predicate(item):
            return item["x"] + item["y"] + item["z"] > 20

        # Act
        result = find(items, complex_predicate)

        # Assert
        assert result == items[2]


# ==================== PARAMETRIZED UTILITY TESTS ====================


class TestUtilityParametrized:
    """Parametrized tests for utility functions."""

    @pytest.mark.parametrize("items,predicate,expected", [
        ([1, 2, 3, 4, 5], lambda x: x > 3, 4),
        (["a", "b", "c"], lambda x: x == "b", "b"),
        ([{"id": 1}, {"id": 2}], lambda x: x["id"] == 2, {"id": 2}),
        ([], lambda x: True, None),
        ([0, False, "", None], lambda x: x, None),
    ])
    def test_find_various_scenarios(self, items, predicate, expected):
        """
        GIVEN: Various lists and predicates
        WHEN: find is called
        THEN: Expected results are returned
        """
        # Act
        result = find(items, predicate)

        # Assert
        assert result == expected

    @pytest.mark.parametrize("value", [
        "550e8400-e29b-41d4-a716-446655440000",
        "12345678-1234-1234-1234-123456789012",
        "00000000-0000-0000-0000-000000000000",
    ])
    def test_valid_uuid_strings(self, value):
        """
        GIVEN: Valid UUID strings
        WHEN: Converting to UUID
        THEN: All conversions succeed
        """
        # Act
        uuid_obj = UUID(value)

        # Assert
        assert isinstance(uuid_obj, UUID)
        assert str(uuid_obj) == value.lower()


# ==================== MOCKING SCENARIOS ====================


class TestUtilityWithMocks:
    """Tests using mocks to verify utility behavior."""

    def test_find_calls_predicate_correct_times(self):
        """
        GIVEN: List and mock predicate
        WHEN: find is called
        THEN: Predicate is called for each item until match
        """
        # Arrange
        items = [1, 2, 3, 4, 5]
        predicate = MagicMock(side_effect=lambda x: x == 3)

        # Act
        result = find(items, predicate)

        # Assert
        assert result == 3
        assert predicate.call_count == 3  # Called for 1, 2, 3

    def test_find_stops_at_first_match(self):
        """
        GIVEN: List with multiple matches
        WHEN: find is called
        THEN: Predicate stops being called after first match
        """
        # Arrange
        items = [1, 2, 3, 4, 5]
        predicate = MagicMock(side_effect=lambda x: x > 2)

        # Act
        result = find(items, predicate)

        # Assert
        assert result == 3
        # Predicate should only be called 3 times (1, 2, 3)
        assert predicate.call_count == 3
