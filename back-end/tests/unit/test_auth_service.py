"""
Unit tests for AuthService.

Tests cover authentication logic with all external dependencies mocked.
Follows enterprise-grade testing practices with clear arrangement, action, and assertion.
"""

import pytest
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID
from fastapi import HTTPException
from argon2.exceptions import VerifyMismatchError

if TYPE_CHECKING:
    from src.services.auth.auth_service import AuthService
    from src.models.auth_user import AuthUserSchema
else:
    from services.auth.auth_service import AuthService
    from models.auth_user import AuthUserSchema


# Fixtures
@pytest.fixture
def mock_user_repo():
    """Mock UserRepository with all required methods."""
    return AsyncMock()


@pytest.fixture
def mock_link_repo():
    """Mock LinkedAccountsRepository with all required methods."""
    return AsyncMock()


@pytest.fixture
def mock_token_vault_repo():
    """Mock TokenVaultRepository with all required methods."""
    return AsyncMock()


@pytest.fixture
def auth_service(mock_user_repo, mock_link_repo, mock_token_vault_repo):
    """Create AuthService instance with mocked dependencies."""
    with patch("services.auth.auth_service.PasswordHasher") as mock_hasher_class:
        mock_hasher_instance = MagicMock()
        mock_hasher_class.return_value = mock_hasher_instance

        service = AuthService(
            user_repo=mock_user_repo,
            link_repo=mock_link_repo,
            token_vault_repo=mock_token_vault_repo,
        )
        service.hasher = mock_hasher_instance
    return service


@pytest.fixture
def mock_db_session():
    """Mock AsyncSession."""
    return AsyncMock()


@pytest.fixture
def test_user_data():
    """Test user data factory."""
    return {
        "id": UUID("550e8400-e29b-41d4-a716-446655440000"),
        "email": "test@example.com",
        "username": "testuser",
        "password": "$argon2id$v=19$m=65540,t=3,p=4$...",  # Hashed password
        "email_confirmed": True,
    }


# Tests
@pytest.mark.asyncio
async def test_login_classic_success_with_valid_credentials(
    auth_service: AuthService,
    mock_db_session,
    mock_user_repo,
    test_user_data,
):
    """
    GIVEN: A valid user with correct email and password
    WHEN: User logs in with correct credentials
    THEN: JWT token is returned
    """
    # Arrange
    email = "test@example.com"
    password = "correct_password"
    hashed_password = test_user_data["password"]

    mock_user = MagicMock(spec=AuthUserSchema)
    mock_user.id = test_user_data["id"]
    mock_user.username = test_user_data["username"]
    mock_user.password = hashed_password
    mock_user.email = email

    mock_user_repo.get_one.return_value = mock_user

    # Mock password verification and rehash check
    auth_service.hasher.verify = MagicMock()
    auth_service.hasher.check_needs_rehash = MagicMock(return_value=False)

    with patch.object(auth_service, "encode_jwt", return_value="test_jwt_token") as mock_encode:
        # Act
        token = await auth_service.login_classic(mock_db_session, email, password)

    # Assert
    assert token == "test_jwt_token"
    mock_user_repo.get_one.assert_called_once_with(mock_db_session, email, column="email")
    auth_service.hasher.verify.assert_called_once_with(hashed_password, password)
    mock_encode.assert_called_once_with(test_user_data["id"], test_user_data["username"])


@pytest.mark.asyncio
async def test_login_classic_updates_password_hash_when_needed(
    auth_service: AuthService,
    mock_db_session,
    mock_user_repo,
    test_user_data,
):
    """
    GIVEN: A valid user with outdated password hash
    WHEN: User logs in successfully
    THEN: Password hash is updated in database
    """
    # Arrange
    email = "test@example.com"
    password = "correct_password"
    new_hash = "$argon2id$v=19$m=65540,t=3,p=4$new_hash"

    mock_user = MagicMock(spec=AuthUserSchema)
    mock_user.id = test_user_data["id"]
    mock_user.username = test_user_data["username"]
    mock_user.password = test_user_data["password"]
    mock_user.email = email

    mock_user_repo.get_one.return_value = mock_user

    # Mock password verification and rehash
    auth_service.hasher.verify = MagicMock()
    auth_service.hasher.check_needs_rehash = MagicMock(return_value=True)
    auth_service.hasher.hash = MagicMock(return_value=new_hash)

    with patch.object(auth_service, "encode_jwt", return_value="test_jwt_token"):
        # Act
        await auth_service.login_classic(mock_db_session, email, password)

    # Assert
    assert mock_user.password == new_hash
    mock_user_repo.update.assert_called_once_with(mock_db_session, mock_user)


@pytest.mark.asyncio
async def test_login_classic_fails_with_wrong_password(
    auth_service: AuthService,
    mock_db_session,
    mock_user_repo,
    test_user_data,
):
    """
    GIVEN: A valid user exists in database
    WHEN: User provides wrong password
    THEN: HTTPException with 400 status is raised
    """
    # Arrange
    email = "test@example.com"
    password = "wrong_password"

    mock_user = MagicMock(spec=AuthUserSchema)
    mock_user.password = test_user_data["password"]

    mock_user_repo.get_one.return_value = mock_user
    auth_service.hasher.verify = MagicMock(side_effect=VerifyMismatchError("Password mismatch"))

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login_classic(mock_db_session, email, password)

    assert exc_info.value.status_code == 400
    assert "Wrong password or email" in exc_info.value.detail


@pytest.mark.asyncio
async def test_login_classic_fails_when_user_not_found(
    auth_service: AuthService,
    mock_db_session,
    mock_user_repo,
):
    """
    GIVEN: No user exists with provided email
    WHEN: User attempts to login
    THEN: HTTPException with 400 status is raised
    """
    from simple_repository.exceptions import NotFoundException

    # Arrange
    email = "nonexistent@example.com"
    password = "any_password"

    mock_user_repo.get_one.side_effect = NotFoundException("User not found")

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login_classic(mock_db_session, email, password)

    assert exc_info.value.status_code == 400
    assert "Wrong password or email" in exc_info.value.detail


@pytest.mark.asyncio
async def test_login_classic_fails_when_user_has_no_password(
    auth_service: AuthService,
    mock_db_session,
    mock_user_repo,
):
    """
    GIVEN: User exists but has no password (social login only)
    WHEN: User attempts classic login
    THEN: HTTPException with 400 status is raised
    """
    # Arrange
    email = "social_only@example.com"
    password = "any_password"

    mock_user = MagicMock(spec=AuthUserSchema)
    mock_user.password = None

    mock_user_repo.get_one.return_value = mock_user

    # Act & Assert
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login_classic(mock_db_session, email, password)

    assert exc_info.value.status_code == 400
    assert "Wrong password or email" in exc_info.value.detail
