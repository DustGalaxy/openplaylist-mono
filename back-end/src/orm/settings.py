import enum
from typing import Literal, Optional
from uuid import UUID

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID, JSONB

from src.database import Base, UUIDMixin, TimestampMixin
from src._types import _All_Platforms, DB_DonationPlatform, ChatPlatform, Platform


class Settings(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "settings"

    playlist_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    max_playlist_size: Mapped[int] = mapped_column(default=0, nullable=False)

    mode: Mapped[Literal["flow", "static"]] = mapped_column(default="flow", nullable=False)
    repeat_mode: Mapped[Literal["all", "once", "none"]] = mapped_column(default="none", nullable=False)
    sort_settings: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default={"date": "desc", "priority": "none", "shuffle": "none"}
    )

    cost_mode: Mapped[Literal["add", "max"]] = mapped_column(default="max", nullable=False)

    content_settings: Mapped[list["ContentSettings"]] = relationship(
        back_populates="settings",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    chat_rules: Mapped[list["ChatRules"]] = relationship(
        back_populates="settings",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    donation_rules: Mapped[list["DonationRules"]] = relationship(
        back_populates="settings",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    track_black_list: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True, default=list)
    block_list: Mapped[list["BlockList"]] = relationship(
        back_populates="settings",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self):
        return (
            f"<PlaylistSettings({self.id=}, {self.playlist_id=}, "
            f"{self.track_black_list=}, {self.block_list=}, {self.created_at=}, "
            f"{self.updated_at=})>"
        )


class ContentSettings(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "content_settings"

    settings_id: Mapped[UUID] = mapped_column(ForeignKey("settings.id", ondelete="CASCADE"))
    settings: Mapped["Settings"] = relationship(
        back_populates="content_settings",
        lazy="selectin",
    )
    platform: Mapped[_All_Platforms] = mapped_column(Enum(_All_Platforms), nullable=False)

    min_views: Mapped[int | None] = mapped_column(default=10_000, nullable=False)
    min_likes: Mapped[int] = mapped_column(default=500, nullable=False)
    max_duration: Mapped[int] = mapped_column(default=600, nullable=False)
    track_cooldown: Mapped[int] = mapped_column(default=0, nullable=False)
    user_cooldown: Mapped[int] = mapped_column(default=2, nullable=False)


class BlockTrigger(enum.Enum):
    USER_ID = "USER_ID"
    USER_NAME = "USER_NAME"


class BlockList(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "block_list"

    settings_id: Mapped[UUID] = mapped_column(ForeignKey("settings.id", ondelete="CASCADE"))
    settings: Mapped["Settings"] = relationship(
        back_populates="block_list",
        lazy="selectin",
    )

    trigger_type: Mapped[BlockTrigger] = mapped_column(Enum(BlockTrigger))
    trigger_value: Mapped[str] = mapped_column(String(255))

    platform: Mapped[Platform] = mapped_column(Enum(Platform), nullable=False)


class DonationRules(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "donation_rules"

    settings_id: Mapped[UUID] = mapped_column(ForeignKey("settings.id", ondelete="CASCADE"))
    settings: Mapped["Settings"] = relationship(
        back_populates="donation_rules",
        lazy="selectin",
    )
    platform: Mapped[DB_DonationPlatform] = mapped_column(Enum(DB_DonationPlatform), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)

    currency: Mapped[str] = mapped_column(String(3), default="USD")
    amount: Mapped[float] = mapped_column(default=5.0, nullable=False)

    priority: Mapped[int] = mapped_column(Integer, nullable=False)

    content_settings: Mapped[dict] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index(
            "ix_donation_rules_unique_trigger",
            "settings_id",
            "platform",
            "currency",
            "amount",
            unique=True,
        ),
    )


class ChatRules(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chat_rules"

    settings_id: Mapped[UUID] = mapped_column(ForeignKey("settings.id", ondelete="CASCADE"))
    settings: Mapped["Settings"] = relationship(
        back_populates="chat_rules",
        lazy="selectin",
    )
    platform: Mapped[ChatPlatform] = mapped_column(Enum(ChatPlatform), nullable=False)

    key: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)

    content_settings: Mapped[dict] = mapped_column(JSONB, nullable=True)
    overrive_order: Mapped[int] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index(
            "ix_chat_rules_unique_trigger",
            "settings_id",
            "platform",
            "key",
            unique=True,
        ),
    )
