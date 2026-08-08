import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src._types import IntegrationPlatform
from src.dal.postgres.twitch_admin_token import (
    TwitchAdminTokenRepository,
    twitch_admin_token_repository,
)
from src.models.twitch_admin_token import TwitchAdminTokenDomain
from src.orm.auth_user import UserRole
from src.orm.linked_accounts import LinkedAccounts
from src.services.auth.twitch_service import auth_twitch_service

logger = logging.getLogger(__name__)

TIER_MAP = {
    "1000": 1,
    "2000": 2,
    "3000": 3,
}


class TwitchSubService:
    def __init__(self, token_repo: TwitchAdminTokenRepository = twitch_admin_token_repository):
        self.token_repo = token_repo

    async def sync_subscribers_for_token(self, session: AsyncSession, admin_token: TwitchAdminTokenDomain) -> dict[str, int]:
        """Fetch subscribers from Twitch Helix API for a specific admin channel and update UserRole records in DB."""
        if not admin_token.twitch_user_id:
            logger.warning(f"Admin token {admin_token.id} has no twitch_user_id, skipping.")
            return {"matched": 0, "created": 0, "updated": 0, "total_subs_fetched": 0}

        try:
            raw_subs = auth_twitch_service.get_broadcaster_subscriptions(
                access_token=admin_token.access_token,
                broadcaster_id=admin_token.twitch_user_id,
            )
        except Exception as ex:
            logger.error(f"Error fetching subs for admin token {admin_token.id} (user {admin_token.twitch_username}): {ex}")
            return {"matched": 0, "created": 0, "updated": 0, "total_subs_fetched": 0}

        now = datetime.now(UTC)
        expires_at = now + timedelta(days=32)

        active_sub_twitch_ids: set[str] = set()
        sub_tier_by_twitch_id: dict[str, int] = {}

        for item in raw_subs:
            sub_twitch_id = str(item.get("user_id", "")).strip()
            raw_tier = str(item.get("tier", "1000"))
            numeric_tier = TIER_MAP.get(raw_tier, 1)

            if sub_twitch_id:
                active_sub_twitch_ids.add(sub_twitch_id)
                sub_tier_by_twitch_id[sub_twitch_id] = numeric_tier

        if not active_sub_twitch_ids:
            logger.info(f"No subscribers found for channel {admin_token.twitch_username or admin_token.twitch_user_id}.")
            return {"matched": 0, "created": 0, "updated": 0, "total_subs_fetched": len(raw_subs)}

        # Find internal User IDs matching these Twitch IDs via LinkedAccounts
        stmt_links = select(LinkedAccounts).where(
            LinkedAccounts.platform == IntegrationPlatform.TWITCH,
            LinkedAccounts.platform_user_id.in_(list(active_sub_twitch_ids)),
        )
        res_links = await session.execute(stmt_links)
        linked_accounts = res_links.scalars().all()

        user_tier_map: dict[Any, int] = {}
        for link in linked_accounts:
            user_tier_map[link.user_id] = sub_tier_by_twitch_id.get(link.platform_user_id, 1)

        created_count = 0
        updated_count = 0

        for user_id, tier in user_tier_map.items():
            stmt_role = select(UserRole).where(
                UserRole.id == "twitch_sub",
                UserRole.user_id == user_id,
            )
            res_role = await session.execute(stmt_role)
            existing_role = res_role.scalars().one_or_none()

            if existing_role:
                existing_role.tier = tier
                existing_role.is_active = True
                existing_role.expires_at = expires_at
                updated_count += 1
            else:
                new_role = UserRole(
                    id="twitch_sub",
                    user_id=user_id,
                    tier=tier,
                    start_date=now,
                    expires_at=expires_at,
                    is_active=True,
                )
                session.add(new_role)
                created_count += 1

        await session.commit()

        stats = {
            "matched": len(user_tier_map),
            "created": created_count,
            "updated": updated_count,
            "total_subs_fetched": len(raw_subs),
        }
        logger.info(f"Sub sync stats for channel '{admin_token.twitch_username or admin_token.twitch_user_id}': {stats}")
        return stats

    async def sync_all_admin_subscribers(self, session: AsyncSession) -> dict[str, Any]:
        """Fetch subscriber lists for all active admin tokens and update user subscription roles."""
        active_tokens = await self.token_repo.fetch_all_active_tokens(session)
        total_stats = {
            "tokens_processed": len(active_tokens),
            "matched": 0,
            "created": 0,
            "updated": 0,
            "total_subs_fetched": 0,
        }

        for token in active_tokens:
            token_stats = await self.sync_subscribers_for_token(session, token)
            total_stats["matched"] += token_stats["matched"]
            total_stats["created"] += token_stats["created"]
            total_stats["updated"] += token_stats["updated"]
            total_stats["total_subs_fetched"] += token_stats["total_subs_fetched"]

        return total_stats


twitch_sub_service = TwitchSubService()
