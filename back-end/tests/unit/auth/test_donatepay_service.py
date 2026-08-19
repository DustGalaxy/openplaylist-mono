from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from src._types import AuthFlow, IntegrationPlatform, IntegrationType
from src.services.auth.donatepay_service import AuthDonatePayService


@pytest.fixture
def donatepay_service():
    return AuthDonatePayService()


def test_donatepay_service_meta(donatepay_service):
    assert donatepay_service.name == "DonatePay"
    assert donatepay_service.meta.platform == IntegrationPlatform.DONATEPAY
    assert donatepay_service.meta.auth_flow == AuthFlow.USER_KEY
    assert donatepay_service.meta.integration_type == IntegrationType.BOT_ONLY


@patch("httpx.get")
def test_get_data_success(mock_get, donatepay_service):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "success",
        "data": {
            "id": 903168,
            "name": "TestUser",
            "avatar": "https://example.com/avatar.png",
        },
    }
    mock_get.return_value = mock_response

    user_data = donatepay_service.get_data("test_user_key")
    assert user_data["id"] == 903168
    assert user_data["name"] == "TestUser"


@patch("httpx.get")
def test_get_data_error(mock_get, donatepay_service):
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.text = "Invalid access token"
    mock_get.return_value = mock_response

    with pytest.raises(HTTPException):
        donatepay_service.get_data("invalid_token")


@pytest.mark.asyncio
@patch("httpx.get")
async def test_fetch_identity_success(mock_get, donatepay_service):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "status": "success",
        "data": {
            "id": 903168,
            "name": "DonatePayUser",
            "avatar": "https://example.com/avatar.png",
        },
    }
    mock_get.return_value = mock_response

    result = await donatepay_service.fetch_identity(user_key="valid_user_key")
    assert result.user.id == "903168"
    assert result.user.username == "DonatePayUser"
    assert result.tokens.access_token == "valid_user_key"
