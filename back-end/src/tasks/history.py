from src.dal.postgres.history import playback_history_repository
from src.database import async_session_maker
from taskiq_broker import task_broker as taskiq_broker


@taskiq_broker.task(task_name="history.cleanup_old", schedule=[{"cron": "0 0 1 * *"}])
async def cleanup_old_history(days: int = 90) -> int:
    async with async_session_maker() as session:
        removed_count = await playback_history_repository.clean_old_history(session, days=days)
        return removed_count
