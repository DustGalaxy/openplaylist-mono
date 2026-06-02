import json
import logging
from uuid import UUID

from uuid6 import uuid7

from dto.da import DonationData
from dto.order import OrderNew
from adapters._rabbit.broker import rabbit_broker, order_new, main_exchange


logger = logging.getLogger(__name__)

async def _request_processing(owner_id: UUID, donation: DonationData):
    logger.info("Donation is valid. Requesting order...")

    await rabbit_broker.publish(
        OrderNew(
            request_id=uuid7(),
            owner_id=owner_id,
            owner_platform_id=str(donation.recipient.user_id),
            requester_id=0,
            requester_nickname=donation.username,
            donation_amount=donation.amount_in_user_currency,
            donation_currency=donation.currency,
            yt_video_url=donation.message,
            priority="donation",
        ),
        order_new,
        main_exchange,
    )


async def handler(message_str: str, owner_id: UUID, channel_name: str) -> None:
    try:
        message = json.loads(message_str)
        if "result" in message and "channel" in message["result"] and message["result"]["channel"] == channel_name:
            if "data" in message["result"] and "data" in message["result"]["data"]:
                donation_data = message["result"]["data"]["data"]
                logger.info(
                    f"Received donation: ID={donation_data.get('id')}, User={donation_data.get('username') or donation_data.get('name')}, Amount={donation_data.get('amount')} {donation_data.get('currency')}"
                )
                donation = DonationData.model_validate(donation_data)
                await _request_processing(owner_id, donation)

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