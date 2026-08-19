import json
import logging
import time
from uuid import UUID

import httpx
from src.adapters._rabbit.broker import (
    auth_user_da_tokens_refreshed,
    main_exchange,
    rabbit_broker,
    user_token_died,
)
from src.adapters._rabbit.dto import DATokenRefreshed
from src.config import settings

logger = logging.getLogger(__name__)


class DonationAlertsApiClient:
    def __init__(
        self,
        api_base_url: str = settings.DA_API_BASE_URL,
        token_url: str = settings.DA_TOKEN_URL,
        app_id: str = settings.APP_ID,
        api_key: str = settings.API_KEY,
        redirect_uri: str = settings.REDIRECT_URI,
    ) -> None:
        self.api_base_url = api_base_url
        self.token_url = token_url
        self.app_id = app_id
        self.api_key = api_key
        self.redirect_uri = redirect_uri

    async def get_user_info(self, access_token: str, client: httpx.AsyncClient | None = None) -> dict:
        """Получает информацию о пользователе и токен подключения к Centrifugo сокетам."""
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"{self.api_base_url}/user/oauth"

        should_close = False
        if client is None:
            client = httpx.AsyncClient(timeout=10.0)
            should_close = True

        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            if not data or "data" not in data:
                raise ValueError(f"Invalid user info response from {url}: {data}")

            user_data = data.get("data", {})
            user_id = user_data.get("id")
            socket_token = user_data.get("socket_connection_token")

            if not user_id or not socket_token:
                raise ValueError("Missing user_id or socket_connection_token in DA API response")

            return {
                "user_id": str(user_id),
                "socket_connection_token": str(socket_token),
            }
        except Exception as e:
            logger.error(f"Error fetching user info from {url}: {e}")
            raise
        finally:
            if should_close:
                await client.aclose()

    async def get_subscription_token(
        self,
        access_token: str,
        client_id: str,
        channel_name: str,
        client: httpx.AsyncClient | None = None,
    ) -> str:
        """Получает токен подписки на канал донатов в Centrifugo."""
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"{self.api_base_url}/centrifuge/subscribe"
        payload = {"client": client_id, "channels": [channel_name]}

        should_close = False
        if client is None:
            client = httpx.AsyncClient(timeout=10.0)
            should_close = True

        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

            if not data or "channels" not in data or not isinstance(data["channels"], list):
                raise ValueError(f"Invalid subscription response from {url}: {data}")

            for ch_info in data["channels"]:
                if ch_info.get("channel") == channel_name and "token" in ch_info:
                    return str(ch_info["token"])

            raise ValueError(f"Subscription token for channel '{channel_name}' not found in DA response: {data}")
        except Exception as e:
            logger.error(f"Error fetching subscription token for {channel_name}: {e}")
            raise
        finally:
            if should_close:
                await client.aclose()

    async def refresh_token(
        self,
        refresh_token: str,
        user_id: UUID,
        platform_user_id: str,
        client: httpx.AsyncClient | None = None,
    ) -> dict | None:
        """Обновляет OAuth access_token с помощью refresh_token."""
        logger.info(f"Attempting to refresh OAuth token for platform_user_id='{platform_user_id}' (user_id={user_id})...")
        data = {
            "grant_type": "refresh_token",
            "client_id": self.app_id,
            "client_secret": self.api_key,
            "refresh_token": refresh_token,
            "redirect_uri": self.redirect_uri,
        }

        should_close = False
        if client is None:
            client = httpx.AsyncClient(timeout=10.0)
            should_close = True

        try:
            response = await client.post(self.token_url, data=data)

            if response.status_code == 200:
                new_token_data = response.json()
                if not new_token_data.get("refresh_token"):
                    new_token_data["refresh_token"] = refresh_token

                token_refreshed_dto = DATokenRefreshed(
                    user_id=user_id,
                    platform_user_id=platform_user_id,
                    access_token=new_token_data["access_token"],
                    refresh_token=new_token_data["refresh_token"],
                    expires_at=new_token_data.get("expires_in", 86400) + int(time.time()),
                )

                await rabbit_broker.publish(
                    token_refreshed_dto,
                    auth_user_da_tokens_refreshed,
                    main_exchange,
                )
                logger.info(f"Successfully refreshed and published OAuth tokens for platform_user_id='{platform_user_id}'")
                return new_token_data
            else:
                logger.warning(
                    f"Token refresh failed (status={response.status_code}) for platform_user_id='{platform_user_id}'. Body: {response.text}"
                )
                await rabbit_broker.publish(
                    {
                        "refresh_token": refresh_token,
                        "platform_user_id": platform_user_id,
                    },
                    user_token_died,
                    exchange=main_exchange,
                )
                return None
        except httpx.RequestError as e:
            logger.error(f"Network error during token refresh for platform_user_id='{platform_user_id}': {e}")
            return None
        except Exception as e:
            logger.exception(f"Unexpected error during token refresh for platform_user_id='{platform_user_id}': {e}")
            return None
        finally:
            if should_close:
                await client.aclose()


da_api_client = DonationAlertsApiClient()
