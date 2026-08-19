import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
import pytest

from acl.user import UserACL


@pytest.mark.asyncio
async def test_user_acl_success():
    user_id = str(uuid4())
    mock_users = [
        {
            "user_id": user_id,
            "da_id": "1772371",
            "access_token": "acc_1",
            "refresh_token": "ref_1",
            "expires_at": 12345,
        }
    ]

    mock_msg = MagicMock()
    mock_msg.body = json.dumps(mock_users).encode("utf-8")

    with patch("acl.user.rabbit_broker.request", new_callable=AsyncMock) as mock_request:
        mock_request.return_value = mock_msg

        users = await UserACL.get_users()
        assert users is not None
        assert len(users) == 1
        assert str(users[0].user_id) == user_id
        assert users[0].platform_user_id == "1772371"


@pytest.mark.asyncio
async def test_user_acl_all_retries_fail():
    with patch("acl.user.rabbit_broker.request", new_callable=AsyncMock) as mock_request:
        mock_request.side_effect = TimeoutError("Timeout")

        users = await UserACL.get_users()
        assert users is None
        assert mock_request.await_count == 5
