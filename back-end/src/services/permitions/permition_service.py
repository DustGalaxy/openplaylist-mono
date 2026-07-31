from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.dal.postgres.feature_flags import feature_flags_repository
from src.models.auth_user import AuthUserSchema, Role
from src.models.feature_flags import FeatureFlagSchema


class FeatureDisabledError(HTTPException):
    def __init__(self, key: str):
        super().__init__(403, detail=f"Feature '{key}' is currently disabled")


class InsufficientTierError(HTTPException):
    def __init__(self, key: str, required: int, current: int):
        super().__init__(403, detail=f"Requires tier {required} for '{key}', current tier {current}")


FEATURE_FLAGS: dict[str, FeatureFlagSchema] = {}


async def load_feature_flags(session: AsyncSession) -> None:
    """Вызывается один раз в FastAPI lifespan при старте процесса."""
    result, _ = await feature_flags_repository.get_all(session)
    FEATURE_FLAGS.clear()
    FEATURE_FLAGS.update({f.key: f for f in result})


def get_effective_tier(roles: list[Role], now: datetime | None = None) -> int:
    now = now or datetime.now()
    active = (r.tier for r in roles if r.is_active and (r.expires_at is None or r.expires_at > now))
    return max(active, default=0)


def check_feature(user: AuthUserSchema, key: str) -> None:
    """Бросает HTTPException, если у user недостаточно тира или фича выключена.
    Для playlist-scoped фич передавай playlist.owner, не текущего юзера сессии."""
    flag = FEATURE_FLAGS.get(key)
    if flag is None:
        raise RuntimeError(f"check_feature: unknown key '{key}' (typo or missing migration)")

    if not flag.is_enabled:
        raise FeatureDisabledError(key)

    tier = get_effective_tier(user.roles)
    if tier < flag.min_tier:
        raise InsufficientTierError(key, flag.min_tier, tier)
