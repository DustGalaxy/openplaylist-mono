from datetime import UTC, datetime, timedelta, timezone

from simple_repository import crud_factory
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.twitch_admin_token import (
    TwitchAdminTokenCreate,
    TwitchAdminTokenDomain,
    TwitchAdminTokenUpdate,
)
from src.orm.twitch_admin_token import TwitchAdminToken


class TwitchAdminTokenRepository(
    crud_factory(
        TwitchAdminToken,
        TwitchAdminTokenDomain,
        TwitchAdminTokenCreate,
        TwitchAdminTokenUpdate,
    )  # ty:ignore[unsupported-base]
):
    def to_inner(self, data: TwitchAdminTokenCreate | TwitchAdminTokenDomain | TwitchAdminTokenUpdate) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: TwitchAdminToken) -> TwitchAdminTokenDomain:
        return self.domain_model.model_validate(object)

    async def fetch_tokens_to_refresh(self, session: AsyncSession) -> list[TwitchAdminTokenDomain]:
        """Fetch active Twitch admin tokens that expire within 30 minutes or have no expiration date set."""
        now = datetime.now(UTC)
        threshold = now + timedelta(minutes=30)

        stmt = select(TwitchAdminToken).where(
            TwitchAdminToken.is_active == True,  # noqa: E712
            TwitchAdminToken.refresh_token.isnot(None),
            (TwitchAdminToken.expires_at.is_(None)) | (TwitchAdminToken.expires_at <= threshold),
        )

        result = await session.execute(stmt)
        tokens = result.scalars().all()
        return [self.to_repr(t) for t in tokens]

    async def fetch_all_active_tokens(self, session: AsyncSession) -> list[TwitchAdminTokenDomain]:
        """Fetch all active Twitch admin tokens."""
        stmt = select(TwitchAdminToken).where(
            TwitchAdminToken.is_active == True,  # noqa: E712
            TwitchAdminToken.refresh_token.isnot(None),
        )
        result = await session.execute(stmt)
        tokens = result.scalars().all()
        return [self.to_repr(t) for t in tokens]

    async def get_by_twitch_user_id(self, session: AsyncSession, twitch_user_id: str) -> TwitchAdminTokenDomain | None:
        """Find an existing active token record by Twitch user ID."""
        stmt = select(TwitchAdminToken).where(
            TwitchAdminToken.twitch_user_id == twitch_user_id,
            TwitchAdminToken.is_active == True,  # noqa: E712
        )
        result = await session.execute(stmt)
        token = result.scalars().first()
        return self.to_repr(token) if token else None


twitch_admin_token_repository = TwitchAdminTokenRepository()
