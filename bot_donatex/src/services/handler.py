import logging
from uuid import UUID

from src.adapters._rabbit.broker import main_exchange, order_new, rabbit_broker
from src.dto.donatex import DonationData
from src.dto.order import OrderNew
from src.utils import extract_youtube_url
from uuid6 import uuid7

logger = logging.getLogger(__name__)


async def _request_processing(owner_id: UUID, donation: DonationData, owner_platform_id: str, yt_url: str):
    logger.info(
        f"Publishing new order to '{order_new.name}' (requester='{donation.username}', amount={donation.amount} {donation.currency})..."
    )

    await rabbit_broker.publish(
        OrderNew(
            request_id=uuid7(),
            owner_id=owner_id,
            owner_platform_id=owner_platform_id,
            requester_id="",
            requester_nickname=donation.username,
            donation_amount=donation.amount,
            donation_currency=donation.currency,
            yt_video_url=yt_url,
            priority="donation",
        ),
        order_new,
        main_exchange,
    )
    logger.info(f"Order successfully published to RabbitMQ for platform_user_id='{owner_platform_id}'")


async def handler(donation_data: dict, owner_id: UUID, owner_platform_id: str) -> None:
    try:
        donation = DonationData.model_validate(donation_data)
    except Exception as e:
        logger.warning(
            f"Failed to validate DonateX donation payload for platform_user_id='{owner_platform_id}': {e}. Payload preview: {donation_data}"
        )
        return

    yt_url = extract_youtube_url(donation.message)
    if yt_url:
        logger.info(
            f"Extracted YouTube URL '{yt_url}' from donation by '{donation.username}' ({donation.amount} {donation.currency})"
        )
        try:
            await _request_processing(owner_id, donation, owner_platform_id, yt_url)
        except Exception as e:
            logger.error(
                f"Failed to publish order for donation {donation.id} (user='{owner_platform_id}'): {e}",
            )
    else:
        logger.info(
            f"No valid YouTube URL in donation message from '{donation.username}' ({donation.amount} {donation.currency})"
        )
