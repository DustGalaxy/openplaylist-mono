from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base, TimestampMixin, UUIDMixin


class TwitchAdminToken(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "twitch_admin_tokens"

    twitch_user_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    twitch_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    twitch_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    access_token: Mapped[str] = mapped_column(String(1024), nullable=False)
    refresh_token: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    token_type: Mapped[str] = mapped_column(String(50), nullable=False, default="bearer")

    expires_in: Mapped[int | None] = mapped_column(nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    scope: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)

    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
