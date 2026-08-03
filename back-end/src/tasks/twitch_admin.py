import logging

from src.database import async_session_maker
from src.services.admin.twitch_admin_token_service import twitch_admin_token_service
from taskiq_broker import task_broker as taskiq_broker

logger = logging.getLogger(__name__)


@taskiq_broker.task(task_name="twitch.admin.refresh_tokens", schedule=[{"cron": "*/30 * * * *"}])
async def refresh_twitch_admin_tokens(force_all: bool = False) -> int:
    """Taskiq scheduled background task to refresh active Twitch Admin OAuth tokens in DB."""
    async with async_session_maker() as session:
        if force_all:
            tokens_to_refresh = await twitch_admin_token_service.fetch_all_active_tokens(session)
        else:
            tokens_to_refresh = await twitch_admin_token_service.fetch_tokens_to_refresh(session)

        logger.info(f"Found {len(tokens_to_refresh)} Twitch admin tokens to refresh (force_all={force_all}).")

        refreshed_count = 0
        for token in tokens_to_refresh:
            success = await twitch_admin_token_service.refresh_token(token, session)
            if success:
                refreshed_count += 1

        logger.info(f"Finished refreshing Twitch admin tokens. Refreshed: {refreshed_count}/{len(tokens_to_refresh)}.")
        return refreshed_count


@taskiq_broker.task(task_name="twitch.admin.sync_subscribers", schedule=[{"cron": "0 */2 * * *"}])
async def sync_twitch_admin_subscribers() -> dict:
    """Taskiq scheduled background task to fetch Twitch subscribers for admin tokens and update user subscription roles."""
    from src.services.admin.twitch_sub_service import twitch_sub_service

    async with async_session_maker() as session:
        stats = await twitch_sub_service.sync_all_admin_subscribers(session)
        logger.info(f"Finished Twitch admin subscriber sync task. Stats: {stats}")
        return stats
