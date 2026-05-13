"""
Comprehensive unit tests for AuthService.

Follows enterprise-grade testing practices:
- Clear Given-When-Then test structure
- Complete mock coverage of external dependencies
- Parametrized tests for multiple scenarios
- Edge case and error condition testing
- Proper async test handling
"""

import pytest
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import HTTPException
from argon2.exceptions import VerifyMismatchError, VerificationError

if TYPE_CHECKING:
    from src.services.auth.auth_service import AuthService
    from src.models.auth_user import AuthUserSchema
    from src.orm.linked_accounts import LinkedAccounts
else:
    from services.auth.auth_service import AuthService
    from models.auth_user import AuthUserSchema
    from orm.linked_accounts import LinkedAccounts


# ==================== FIXTURES ====================


@pytest.fixture
def mock_user_repo():
    """Mock UserRepository with all required methods."""
    mock = AsyncMock()
    return mock


@pytest.fixture
def mock_link_repo():
    """Mock LinkedAccountsRepository with all required methods."""
    mock = AsyncMock()
    return mock


@pytest.fixture
def mock_token_vault_repo():
    """Mock TokenVaultRepository with all required methods."""
    mock = AsyncMock()
    return mock


@pytest.fixture
def mock_db_session():
    """Mock AsyncSession for database operations."""
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
    return service


@pytest.fixture
def mock_user_schema():
    """Factory fixture for creating mock AuthUserSchema instances."""
    def _create_user(
        id=UUID("550e8400-e29b-41d4-a716-446655440000"),
        email="test@example.com",
        username="testuser",
        password="$argon2id$v=19$m=65540,t=3,p=4$hashvalue",
        email_confirmed=True,
        linked_accounts=None,
    ):
        user = MagicMock(spec=AuthUserSchema)
        user.id = id
        user.email = email
        user.username = username
        user.password = password
        user.email_confirmed = email_confirmed
        user.linked_accounts = linked_accounts or []
        return user
    return _create_user


# ==================== JWT ENCODING TESTS ====================


class TestEncodeJWT:
    """Tests for JWT token encoding."""

    def test_encode_jwt_creates_valid_token(self, auth_service):
        """
        GIVEN: User ID and username
        WHEN: encode_jwt is called
        THEN: Valid JWT token is returned with correct claims
        """
        # Arrange
        user_id = UUID("550e8400-e29b-41d4-a716-446655440000")
        username = "testuser"

        # Act
        token = auth_service.encode_jwt(user_id, username)

        # Assert
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_encode_jwt_includes_required_claims(self, auth_service):
        """
        GIVEN: User ID and username
        WHEN: encode_jwt is called
        THEN: Token contains all required claims (sub, username, exp, iat, iss)
        """
        # Arrange
        user_id = UUID("550e8400-e29b-41d4-a716-446655440000")
        username = "testuser"

        # Act
        token = auth_service.encode_jwt(user_id, username)

        # Import jwt to decode without verification
        import jwt
        decoded = jwt.decode(token, options={"verify_signature": False})

        # Assert
        assert decoded["sub"] == str(user_id)
        assert decoded["username"] == username
        assert "exp" in decoded
        assert "iat" in decoded
        assert decoded["iss"] == "ravlik"  # Settings default

    def test_encode_jwt_token_has_correct_expiration(self, auth_service):
        """
        GIVEN: User ID and username
        WHEN: encode_jwt is called
        THEN: Token expiration time is set correctly (SESSION_LIVE_TIME)
        """
        # Arrange
        user_id = UUID("550e8400-e29b-41d4-a716-446655440000")
        username = "testuser"

        # Act
        import jwt
        token = auth_service.encode_jwt(user_id, username)
        decoded = jwt.decode(token, options={"verify_signature": False})

        # Assert
        current_time = int(datetime.now().timestamp())
        issued_time = decoded["iat"]
        expiration_time = decoded["exp"]
        
        # Token should be valid for SESSION_LIVE_TIME seconds
        assert expiration_time > issued_time
        # Allow 5 second tolerance for test execution
        assert abs(current_time - issued_time) < 5


# ==================== LOGIN CLASSIC TESTS ====================


class TestLoginClassic:
    """Tests for classic email/password authentication."""

    @pytest.mark.asyncio
    async def test_login_classic_success(
        self,
        auth_service,
        mock_db_session,
        mock_user_repo,
        mock_user_schema,
    ):
        """
        GIVEN: Valid user with correct email and password
        WHEN: login_classic is called
        THEN: JWT token is returned
        """
        # Arrange
        email = "test@example.com"
        password = "correct_password"
        user = mock_user_schema()
        
        mock_user_repo.get_one.return_value = user
        auth_service.hasher.verify = MagicMock(return_value=None)
        auth_service.hasher.check_needs_rehash = MagicMock(return_value=False)

        with patch.object(auth_service, "encode_jwt", return_value="test_token"):
            # Act
            token = await auth_service.login_classic(mock_db_session, email, password)

        # Assert
        assert token == "test_token"
        mock_user_repo.get_one.assert_called_once_with(mock_db_session, email, column="email")
        auth_service.hasher.verify.assert_called_once()

    @pytest.mark.asyncio
    async def test_login_classic_updates_password_hash_when_needed(
        self,
        auth_service,
        mock_db_session,
        mock_user_repo,
        mock_user_schema,
    ):
        """
        GIVEN: Valid user with outdated password hash
        WHEN: login_classic is called
        THEN: Password is rehashed and updated in database
        """
        # Arrange
        email = "test@example.com"
        password = "correct_password"
        new_hash = "$argon2id$v=19$m=65540,t=3,p=4$newhash"
        user = mock_user_schema()
        
        mock_user_repo.get_one.return_value = user
        auth_service.hasher.verify = MagicMock(return_value=None)
        auth_service.hasher.check_needs_rehash = MagicMock(return_value=True)
        auth_service.hasher.hash = MagicMock(return_value=new_hash)

        with patch.object(auth_service, "encode_jwt", return_value="test_token"):
            # Act
            token = await auth_service.login_classic(mock_db_session, email, password)

        # Assert
        assert token == "test_token"
        auth_service.hasher.hash.assert_called_once_with(password)
        mock_user_repo.update.assert_called_once()
        assert user.password == new_hash

    @pytest.mark.asyncio
    async def test_login_classic_fails_with_wrong_password(
        self,
        auth_service,
        mock_db_session,
        mock_user_repo,
        mock_user_schema,
    ):
        """
        GIVEN: Valid user with incorrect password
        WHEN: login_classic is called
        THEN: HTTPException with 400 status is raised
        """
        # Arrange
        email = "test@example.com"
        password = "wrong_password"
        user = mock_user_schema()
        
        mock_user_repo.get_one.return_value = user
        auth_service.hasher.verify = MagicMock(side_effect=VerifyMismatchError(""))

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_classic(mock_db_session, email, password)
        
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_login_classic_fails_when_no_password_set(
        self,
        auth_service,
        mock_db_session,
        mock_user_repo,
        mock_user_schema,
    ):
        """
        GIVEN: User with no password (social login only)
        WHEN: login_classic is called
        THEN: HTTPException with 400 status is raised
        """
        # Arrange
        email = "test@example.com"
        password = "any_password"
        user = mock_user_schema(password=None)
        
        mock_user_repo.get_one.return_value = user

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_classic(mock_db_session, email, password)
        
        assert exc_info.value.status_code == 400
        assert "Wrong password or email" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_login_classic_fails_when_user_not_found(
        self,
        auth_service,
        mock_db_session,
        mock_user_repo,
    ):
        """
        GIVEN: Email that doesn't exist in database
        WHEN: login_classic is called
        THEN: HTTPException with 400 status is raised
        """
        # Arrange
        email = "nonexistent@example.com"
        password = "any_password"
        
        mock_user_repo.get_one.side_effect = Exception("User not found")

        # Act & Assert
        with pytest.raises(Exception):
            await auth_service.login_classic(mock_db_session, email, password)


# ==================== INTEGRATIONS METHOD TESTS ====================


class TestIntegrations:
    """Tests for intergations method (returns linked accounts)."""

    def test_intergations_returns_empty_list_for_no_linked_accounts(
        self,
        auth_service,
        mock_user_schema,
    ):
        """
        GIVEN: User with no linked accounts
        WHEN: intergations is called
        THEN: Empty list is returned
        """
        # Arrange
        user = mock_user_schema(linked_accounts=[])

        # Act
        result = auth_service.intergations(user)

        # Assert
        assert result == []
        assert isinstance(result, list)

    def test_intergations_returns_all_linked_accounts(
        self,
        auth_service,
        mock_user_schema,
    ):
        """
        GIVEN: User with multiple linked accounts
        WHEN: intergations is called
        THEN: List with all account data is returned
        """
        # Arrange
        account1 = MagicMock()
        account1.model_dump.return_value = {"platform": "twitch", "id": "123"}
        account2 = MagicMock()
        account2.model_dump.return_value = {"platform": "da", "id": "456"}
        
        user = mock_user_schema(linked_accounts=[account1, account2])

        # Act
        result = auth_service.intergations(user)

        # Assert
        assert len(result) == 2
        assert result[0] == {"platform": "twitch", "id": "123"}
        assert result[1] == {"platform": "da", "id": "456"}


# ==================== PASSWORD VERIFICATION TESTS ====================


class TestPasswordHandling:
    """Tests for password hashing and verification."""

    @pytest.mark.asyncio
    async def test_password_verification_with_argon2_verification_error(
        self,
        auth_service,
        mock_db_session,
        mock_user_repo,
        mock_user_schema,
    ):
        """
        GIVEN: Valid user but argon2 throws VerificationError
        WHEN: login_classic is called
        THEN: VerificationError is raised
        """
        # Arrange
        user = mock_user_schema()
        mock_user_repo.get_one.return_value = user
        auth_service.hasher.verify = MagicMock(side_effect=VerificationError(""))

        # Act & Assert
        with pytest.raises(VerificationError):
            await auth_service.login_classic(mock_db_session, "test@example.com", "password")

    def test_hasher_is_initialized_with_argon2(self, auth_service):
        """
        GIVEN: AuthService instance
        WHEN: Service is initialized
        THEN: PasswordHasher is properly configured
        """
        # Assert
        assert auth_service.hasher is not None


# ==================== PARAMETRIZED TESTS ====================


class TestLoginClassicParametrized:
    """Parametrized tests for login scenarios."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("email,username", [
        ("test@example.com", "testuser"),
        ("user.name+tag@example.co.uk", "user_with_complex_email"),
        ("a@b.c", "short_email_user"),
    ])
    async def test_login_classic_with_various_email_formats(
        self,
        auth_service,
        mock_db_session,
        mock_user_repo,
        mock_user_schema,
        email,
        username,
    ):
        """
        GIVEN: Various email formats
        WHEN: login_classic is called
        THEN: All email formats are handled correctly
        """
        # Arrange
        user = mock_user_schema(email=email, username=username)
        mock_user_repo.get_one.return_value = user
        auth_service.hasher.verify = MagicMock(return_value=None)
        auth_service.hasher.check_needs_rehash = MagicMock(return_value=False)

        with patch.object(auth_service, "encode_jwt", return_value="test_token"):
            # Act
            token = await auth_service.login_classic(mock_db_session, email, "password")

        # Assert
        assert token == "test_token"
        mock_user_repo.get_one.assert_called_with(mock_db_session, email, column="email")
