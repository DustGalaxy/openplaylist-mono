from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, func
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column

from src._types import IntegrationPlatform
from src.database import Base, UUIDMixin, TimestampMixin


class TokenVault(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "token_vault"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    linked_account_id: Mapped[UUID] = mapped_column(ForeignKey("linked_accounts.id", ondelete="CASCADE"), nullable=False)

    platform: Mapped[IntegrationPlatform] = mapped_column(ENUM(IntegrationPlatform), nullable=False)
    platform_user_id: Mapped[str] = mapped_column("platform_user_id", nullable=False)

    access_token: Mapped[str] = mapped_column("access_token", nullable=False)
    refresh_token: Mapped[str] = mapped_column("refresh_token", nullable=False)
    token_type: Mapped[str] = mapped_column("token_type", nullable=False)
    expires_at: Mapped[int] = mapped_column("expires_at", nullable=False)
    last_update: Mapped[datetime] = mapped_column("last_update", nullable=False, server_default=func.now())
