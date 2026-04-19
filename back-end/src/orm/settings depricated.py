from typing import Literal
from uuid import UUID
from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID, JSONB

from database import Base, UUIDMixin, TimestampMixin
from _types import Platform


class PlaylistSettings(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "playlist_settings"

    playlist_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    min_views: Mapped[int] = mapped_column(default=10_000, nullable=False)
    min_likes: Mapped[int] = mapped_column(default=500, nullable=False)
    max_duration: Mapped[int] = mapped_column(default=600, nullable=False)
    track_cooldown: Mapped[int] = mapped_column(default=0, nullable=False)
    user_cooldown: Mapped[int] = mapped_column(default=2, nullable=False)
    
    is_public: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_favorite: Mapped[bool] = mapped_column(default=False, nullable=False)

    donation_currency_amount: Mapped[float] = mapped_column(default=50.0, nullable=False)

    max_playlist_size: Mapped[int] = mapped_column(default=0, nullable=False)

    mode: Mapped[Literal["flow", "static"]] = mapped_column(default="flow", nullable=False)
    repeat_mode: Mapped[Literal["all", "once", "none"]] = mapped_column(default="none", nullable=False)
    sort_settings: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default={"date": "desc", "priority": "none", "shuffle": "none"}
    )

    cost_broacaster: Mapped[int] = mapped_column(default=0, nullable=False)
    cost_donater: Mapped[int] = mapped_column(default=0, nullable=False)
    cost_vip: Mapped[int] = mapped_column(default=0, nullable=False)
    cost_mod: Mapped[int] = mapped_column(default=0, nullable=False)
    cost_subscriber: Mapped[int] = mapped_column(default=0, nullable=False)
    cost_turbo: Mapped[int] = mapped_column(default=0, nullable=False)
    cost_artist: Mapped[int] = mapped_column(default=0, nullable=False)
    cost_fonder: Mapped[int] = mapped_column(default=0, nullable=False)
    cost_follower: Mapped[int] = mapped_column(default=0, nullable=False)

    cost_mode: Mapped[Literal["add", "max"]] = mapped_column(default="max", nullable=False)

    track_black_list: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True, default=list)
    user_black_list: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True, default=list)

    allow_sources: Mapped[list[Platform]] = mapped_column(ARRAY(String), nullable=True, default=list)
    is_allow_external_requests: Mapped[bool] = mapped_column(default=False, nullable=False)

    def __repr__(self):
        return (
            f"<PlaylistSettings({self.id=}, {self.playlist_id=}, {self.min_views=}, "
            f"{self.min_likes=}, {self.is_allow_external_requests=}, {self.is_public=}, "
            f"{self.is_favorite=}, {self.track_black_list=}, {self.user_black_list=}, {self.created_at=}, "
            f"{self.updated_at=})>"
        )

class PlaylistRoleCost(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "playlist_role_costs"

    playlist_settings_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("playlist_settings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Платформа: twitch, youtube, donatepay, etc.
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Роль: vip, mod, subscriber, etc.
    role_name: Mapped[str] = mapped_column(String(50), nullable=False)
    
    cost: Mapped[int] = mapped_column(default=0, nullable=False)

    # Уникальность: для одного плейлиста роль на платформе встречается один раз
    __table_args__ = (
        UniqueConstraint("playlist_settings_id", "platform", "role_name", name="uq_playlist_platform_role"),
    )


class PlaylistContentSettings(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "playlist_content_settings"

    playlist_settings_id: Mapped[UUID] = mapped_column(ForeignKey("playlist_settings.id", ondelete="CASCADE"))
    platform: Mapped[str]  # 'twitch', 'youtube'


class PlaylistPaymentSettings(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "playlist_payment_settings"

    playlist_settings_id: Mapped[UUID] = mapped_column(ForeignKey("playlist_settings.id", ondelete="CASCADE"))
    provider: Mapped[str]  # 'donation_alerts', 'donate_pay'

    donation_currency_amount: Mapped[float] = mapped_column(default=50.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="RUB")