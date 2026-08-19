from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:
    from src.orm.linked_accounts import LinkedAccounts

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base, TimestampMixin, UUIDMixin


class TokenVault(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "token_vault"

    access_token: Mapped[str] = mapped_column("access_token", nullable=False)
    refresh_token: Mapped[str | None] = mapped_column("refresh_token", nullable=True)
    token_type: Mapped[str] = mapped_column("token_type", nullable=False)
    expires_at: Mapped[int | None] = mapped_column("expires_at", nullable=True)

    last_update: Mapped[datetime] = mapped_column("last_update", nullable=False, server_default=func.now())

    linked_account_id: Mapped[UUID] = mapped_column(ForeignKey("linked_accounts.id", ondelete="CASCADE"), nullable=False)
    linked_account: Mapped["LinkedAccounts"] = relationship(lazy="joined", back_populates="tokens")
