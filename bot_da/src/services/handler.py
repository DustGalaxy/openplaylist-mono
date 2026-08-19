import json
import logging
from uuid import UUID
from uuid6 import uuid7

from src.adapters._rabbit.broker import main_exchange, order_new, rabbit_broker
from src.dto.da import DonationData
from src.dto.order import OrderNew
from src.utils import extract_youtube_url


logger = logging.getLogger(__name__)


async def _request_processing(owner_id: UUID, donation: DonationData, yt_url: str) -> None:
    logger.info(
        f"Publishing new order to '{order_new.name}' (requester='{donation.username}', amount={donation.amount_in_user_currency} {donation.currency})..."
    )

    await rabbit_broker.publish(
        OrderNew(
            request_id=uuid7(),
            owner_id=owner_id,
            owner_platform_id=str(donation.recipient.user_id),
            requester_id="",
            requester_nickname=donation.username,
            donation_amount=donation.amount_in_user_currency,
            donation_currency=donation.currency,
            yt_video_url=yt_url,
            priority="donation",
        ),
        order_new,
        main_exchange,
    )
    logger.info(f"Order successfully published for donation ID={donation.id}")


async def _data_proccesing(donation_payload: dict, owner_id: UUID):
    try:
        donation = DonationData.model_validate(donation_payload)
    except Exception as e:
        logger.warning(f"Failed to validate DonationData payload: {e}. Payload: {donation_payload}")
        return

    logger.info(
        f"Received donation ID={donation.id} from '{donation.username}' ({donation.amount_in_user_currency} {donation.currency})"
    )

    yt_url = extract_youtube_url(donation.message)
    if yt_url:
        logger.info(f"Extracted YouTube URL '{yt_url}' from donation ID={donation.id}")
        try:
            await _request_processing(owner_id, donation, yt_url)
        except Exception as e:
            logger.error(f"Failed to publish order for donation ID={donation.id}: {e}", exc_info=True)
    else:
        logger.info(f"No YouTube URL found in message for donation ID={donation.id}")


async def handler(message_str: str, owner_id: UUID, channel_name: str) -> None:
    try:
        message = json.loads(message_str)
    except json.JSONDecodeError:
        logger.error(f"Failed to decode JSON message from channel '{channel_name}': {message_str}")
        return

    try:
        if "result" in message and "channel" in message["result"] and message["result"]["channel"] == channel_name:
            result = message["result"]
            if "data" in result and isinstance(result["data"], dict) and "data" in result["data"]:
                await _data_proccesing(result["data"]["data"], owner_id)
            elif "type" in result and result.get("type") == 1:
                logger.info(f"Subscription confirmation event received on channel '{channel_name}'.")

        elif "id" in message:
            if message.get("id") == 2 and "result" in message:
                logger.info(f"Successfully subscribed to channel '{channel_name}' (received subscribe ack).")
            else:
                logger.debug(f"Received message with id={message.get('id')}: {message_str}")
        else:
            logger.debug(f"Received unhandled message format: {message_str}")

    except Exception as e:
        logger.exception(f"Unexpected error processing Centrifugo message on channel '{channel_name}': {e}")
