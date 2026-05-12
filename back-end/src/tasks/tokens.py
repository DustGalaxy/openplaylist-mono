import asyncio
import random

from services.tokens.token_service import token_service
from adapters._rabbit.event_broker import broker as rabbit_broker, topic_exchange

from database import async_session_maker
from settings import settings
from taskiq_broker import broker as taskiq_broker


@taskiq_broker.task(schedule=[{"cron": "*/10 * * * *"}])
async def refresh_tokens():
    async with async_session_maker() as session:
        tokens = await token_service.fetch_tokens_to_refresh(session)

    for token in tokens:
        fresh_token = await token_service.refresh_token(token)

        await rabbit_broker.publish(
            message={
                "user_id": str(token.user_id),
                "platform_user_id": str(token.platform_user_id),
                "platform": str(token.platform),
                "access_token": fresh_token.access_token,
                "refresh_token": fresh_token.refresh_token,
            },
            exchange=topic_exchange, 
            routing_key=f"auth.token.refreshed.{token.platform}",
            persist=True,
            # Выставляем TTL, например, 1 час (3600000 мс)
            # Если бот не заберет сообщение за это время, оно удалится
            expiration=3600, 
        )

        delay = (random.random() + 0.5) 
        await asyncio.sleep(delay)
    
    