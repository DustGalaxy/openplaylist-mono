import json
import logging
from uuid import UUID

from uuid6 import uuid7

from acl.playlist import PlaylistACL
from dto.da import DonationData
from dto.order import OrderNew
from dto.settings import ReadPlaylistSettings
from adapters._rabbit.broker import rabbit_broker, order_new, main_exchange
# from adapters._redis.broker import redis_adapter
from adapters._repository.user import user_repo

from database import async_session_maker
from utils import video_id, extract_data_from_msg


logger = logging.getLogger(__name__)


# async def get_settings(user_id, playlist_name) -> ReadPlaylistSettings:
#     # redis schema - {user_id}:{playlist_name}:settings
#     raw_settings = redis_adapter.get(f"{user_id}:{playlist_name}:settings")

#     if not raw_settings:
#         settings = await PlaylistACL.fetch_playlist_settings(user_id, playlist_name)
#     else:
#         settings = ReadPlaylistSettings.model_validate_json(raw_settings)

#     return settings


async def _request_processing(donation: DonationData):
    # try:  # try to get playlist name and video id
    #     data: dict[str, str] = extract_data_from_msg(donation.message)
    #     playlsit_name = data["playlsit_name"]
    #     yt_url = data["yt_url"]
    #     yt_id = video_id(yt_url)
    #     if yt_id is None:
    #         raise ValueError
    # except ValueError:
    #     logger.info(f"Skipping donation without playlist name or video id: {donation.message}")
    #     return

    # yt_id = video_id(donation.message)
    # if yt_id is None:
    #     raise ValueError

    async with async_session_maker() as db_session:
        user = await user_repo.get_one(db_session, donation.recipient.user_id, column="da_id")

    # settings = await get_settings(user.id, playlsit_name)

    # if settings.donation_currency_amount != donation.amount_in_user_currency:
    #     logger.info(f"Skipping donation with incorrect currency amount: {donation.amount_in_user_currency}")
    #     return
    # elif f"da:{donation.username}" in settings.user_black_list:
    #     logger.info(f"Skipping donation from blacklisted user: {donation.username}")
    #     return
    # elif yt_id in settings.track_black_list:
    #     logger.info(f"Skipping donation with blacklisted video: {yt_url}")
    #     return

    logger.info("Donation is valid. Requesting order...")

    await rabbit_broker.publish(
        OrderNew(
            request_id=uuid7(),
            owner_id=UUID(user.id),
            requester_id=donation.recipient.user_id,
            requester_nickname=donation.username,
            donation_currency_amount=donation.amount_in_user_currency,
            yt_video_url=donation.message,
            priority="d",
            source="da",
        ),
        order_new,
        main_exchange,
    )


async def handler(message_str: str, channel_name: str):
    try:
        message = json.loads(message_str)
        if "result" in message and "channel" in message["result"] and message["result"]["channel"] == channel_name:
            if "data" in message["result"] and "data" in message["result"]["data"]:
                donation_data = message["result"]["data"]["data"]
                logger.info(
                    f"Received donation: ID={donation_data.get('id')}, User={donation_data.get('username') or donation_data.get('name')}, Amount={donation_data.get('amount')} {donation_data.get('currency')}"
                )
                donation = DonationData.model_validate(donation_data)
                await _request_processing(donation)

            elif (
                "type" in message["result"]
                and message["result"]["type"] == 1
                and "data" in message["result"]
                and "info" in message["result"]["data"]
            ):
                logger.info("Subscription confirmation message received. Broadcasting connected status.")

                # React to connection
                # await websocket_manager.broadcast({"type": "listener_status", "status": "connected"})
            else:
                logger.warning(f"Received message on channel, but 'data.data' missing: {message_str}")
        elif "id" in message:
            if message.get("id") == 2 and "result" in message:
                logger.info(
                    "Successfully subscribed to channel (received subscribe ack). Broadcasting connected status."
                )

                # React to connection
                # await websocket_manager.broadcast({"type": "listener_status", "status": "connected"})
            else:
                logger.debug(f"Received message with ID (likely ping or subscribe ack): {message_str}")
        else:
            logger.warning(f"Received unhandled message format: {message_str}")

    except json.JSONDecodeError:
        logger.error(f"Failed to decode JSON message: {message_str}")
    except Exception as e:
        logger.exception(f"Error processing message: {e}")
