import logging
from uuid import UUID

from src.adapters._rabbit.broker import main_exchange, order_new, rabbit_broker
from src.dto.donatex import DonationData
from src.dto.order import OrderNew
from src.utils import extract_youtube_url
from uuid6 import uuid7

logger = logging.getLogger(__name__)


async def _request_processing(owner_id: UUID, donation: DonationData, owner_platform_id: str, yt_url: str):
    logger.info("Donation is valid. Requesting order...")

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


async def handler(donation_data: dict, owner_id: UUID, owner_platform_id: str) -> None:

    donation = DonationData.model_validate(donation_data)
    yt_url = extract_youtube_url(donation.message)
    print(yt_url)
    if yt_url:
        await _request_processing(owner_id, donation, owner_platform_id, yt_url)
