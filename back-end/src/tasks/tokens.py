import asyncio
import random

from src.adapters._rabbit.bots.dto import Tokens
from src.adapters._rabbit.broker import main_publisher
from src.adapters._rabbit.queues import topic_exchange
from src.database import async_session_maker
from src.services.tokens.token_service import token_service
from taskiq_broker import task_broker as taskiq_broker


@taskiq_broker.task(schedule=[{"cron": "*/30 * * * *"}])
async def refresh_tokens():
    async with async_session_maker() as session:
        tokens = await token_service.fetch_tokens_to_refresh(session)

    for token in tokens:
        fresh_token = await token_service.refresh_token(token)

        payload = Tokens(
            user_id=str(token.linked_account.user_id),
            platform_user_id=str(token.linked_account.platform_user_id),
            platform=str(token.linked_account.platform),
            access_token=fresh_token.access_token,
            refresh_token=fresh_token.refresh_token or "",
            expires_at=fresh_token.expires_at or 0,
            bot_settings=token.linked_account.bot_settings,
        )

        await main_publisher.publish(
            message=payload.model_dump(),
            exchange=topic_exchange,
            routing_key=f"auth.token.refreshed.{token.linked_account.platform}",
            persist=True,
            expiration=3600,
        )

        delay = random.random() + 0.5
        await asyncio.sleep(delay)

