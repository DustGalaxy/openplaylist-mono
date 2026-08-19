import enum
from typing import TYPE_CHECKING, Literal
from uuid import UUID

from sqlalchemy import Enum, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.associationproxy import AssociationProxy, association_proxy
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src._types import BlockListScope, ChatRuleScope, ContentSettingScope, DonationRuleScope, Platform, Status
from src.database import Base, TimestampMixin, UUIDMixin
from src.orm.moderator import ModeratorPlaylistAccess


def generic_mode_settings():
    return {
        "flow": {
            "priority_break_point": 0,
            "sort_settings_vip": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
            "sort_settings_regular": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
        },
        "static": {
            "priority_break_point": 0,
            "sort_settings_vip": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
            "sort_settings_regular": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
        },
        "stream": {
            "priority_break_point": 0,
            "sort_settings_vip": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
            "sort_settings_regular": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
        },
    }


class Order(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "orders"

    yt_video_id: Mapped[str]
    title: Mapped[str]
    author: Mapped[str] = mapped_column(String(255), nullable=False, default="Unknown", server_default="Unknown")
    duration: Mapped[int]
    views: Mapped[int]
    likes: Mapped[int]

    priority: Mapped[str]

    requester_id: Mapped[str]
    requester_nickname: Mapped[str]

    request_id: Mapped[UUID] = mapped_column(unique=True)
    owner_id: Mapped[UUID]
    owner_platform_id: Mapped[str]
    from_owner: Mapped[bool]

    source: Mapped[Platform] = mapped_column(Enum(Platform, native_enum=False), nullable=False)

    extra_data: Mapped[dict] = mapped_column(JSONB, nullable=True)

    playlist_associations: Mapped[list["OrderPlaylistStatus"]] = relationship(back_populates="order")

    @property
    def note(self) -> str | None:
        if "_dynamic_note" in self.__dict__:
            return self._dynamic_note
        if "playlist_associations" in self.__dict__ and self.__dict__["playlist_associations"]:
            return self.__dict__["playlist_associations"][0].note
        return None

    @property
    def is_note_public(self) -> bool:
        if "_dynamic_is_note_public" in self.__dict__:
            return self._dynamic_is_note_public
        if "playlist_associations" in self.__dict__ and self.__dict__["playlist_associations"]:
            return self.__dict__["playlist_associations"][0].is_note_public
        return True


class Playlist(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "playlists"

    # Основные атрибуты
    owner_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False, index=True)
    owner_nickname: Mapped[str]
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)

    # Флаги видимости
    is_public: Mapped[bool] = mapped_column(default=False, nullable=False)
    favorites_count: Mapped[int] = mapped_column(default=0, nullable=False, server_default="0")
    is_allow_external_requests: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Параметры проигрывания и ограничения
    now_playing: Mapped[str] = mapped_column(String, nullable=True)
    max_playlist_size: Mapped[int] = mapped_column(default=0, nullable=False)
    sync_playback_position: Mapped[bool] = mapped_column(default=False, nullable=False)

    mode: Mapped[Literal["flow", "static", "stream"]] = mapped_column(default="static", nullable=False)
    repeat_mode: Mapped[Literal["all", "once", "none"]] = mapped_column(default="none", nullable=False)
    cost_mode: Mapped[Literal["add", "max"]] = mapped_column(default="max", nullable=False)

    # JSONB конфиги
    allow_sources: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, server_default="[]")
    mode_settings: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=generic_mode_settings(),
        server_default="{}",
    )

    # Массивы
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    track_black_list: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    background_track_ids: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    # Связи с дочерними правилами (теперь привязаны напрямую к Playlist)
    content_settings: Mapped[list["ContentSettings"]] = relationship(
        back_populates="playlist", cascade="all, delete-orphan", lazy="selectin"
    )
    chat_rules: Mapped[list["ChatRules"]] = relationship(back_populates="playlist", cascade="all, delete-orphan", lazy="selectin")
    donation_rules: Mapped[list["DonationRules"]] = relationship(
        back_populates="playlist", cascade="all, delete-orphan", lazy="selectin"
    )
    block_list: Mapped[list["BlockList"]] = relationship(back_populates="playlist", cascade="all, delete-orphan", lazy="selectin")
    moderator_access: Mapped[list["ModeratorPlaylistAccess"]] = relationship(
        back_populates="playlist", cascade="all, delete-orphan", lazy="selectin"
    )

    # Связи заказов
    order_associations: Mapped[list["OrderPlaylistStatus"]] = relationship(
        back_populates="playlist", lazy="selectin", cascade="all, delete-orphan"
    )
    active_order_associations: Mapped[list["OrderPlaylistStatus"]] = relationship(
        primaryjoin="and_(Playlist.id == OrderPlaylistStatus.playlist_id, OrderPlaylistStatus.status == 'in playlist')",
        viewonly=True,
        lazy="joined",
    )

    order_links: AssociationProxy[list["Order"]] = association_proxy(
        target_collection="order_associations", attr="order", creator=lambda obj: OrderPlaylistStatus(order=obj)
    )
    track_data: AssociationProxy[list["Order"]] = association_proxy(target_collection="active_order_associations", attr="order")


class OrderPlaylistStatus(Base, TimestampMixin):
    __tablename__ = "order_playlist_status"

    order_id: Mapped[UUID] = mapped_column(PGUUID, ForeignKey("orders.id", ondelete="CASCADE"), primary_key=True)
    playlist_id: Mapped[UUID] = mapped_column(PGUUID, ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True)
    status: Mapped[Status] = mapped_column(default="in playlist")
    note: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    is_note_public: Mapped[bool] = mapped_column(default=True, nullable=False, server_default="true")

    order: Mapped["Order"] = relationship(back_populates="playlist_associations", lazy="selectin", cascade="all, delete")
    playlist: Mapped["Playlist"] = relationship(back_populates="order_associations")


class ContentSettings(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "content_settings"

    playlist_id: Mapped[UUID] = mapped_column(ForeignKey("playlists.id", ondelete="CASCADE"))
    playlist: Mapped["Playlist"] = relationship(
        back_populates="content_settings",
        lazy="selectin",
    )
    platform: Mapped[ContentSettingScope] = mapped_column(Enum(ContentSettingScope, native_enum=False), nullable=False)

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

    playlist_id: Mapped[UUID] = mapped_column(ForeignKey("playlists.id", ondelete="CASCADE"))
    playlist: Mapped["Playlist"] = relationship(
        back_populates="block_list",
        lazy="selectin",
    )

    trigger_type: Mapped[BlockTrigger] = mapped_column(Enum(BlockTrigger, native_enum=False))
    trigger_value: Mapped[str] = mapped_column(String(255))

    platform: Mapped[BlockListScope] = mapped_column(Enum(BlockListScope, native_enum=False), nullable=False)


class DonationRules(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "donation_rules"

    playlist_id: Mapped[UUID] = mapped_column(ForeignKey("playlists.id", ondelete="CASCADE"))
    playlist: Mapped["Playlist"] = relationship(
        back_populates="donation_rules",
        lazy="selectin",
    )
    platform: Mapped[DonationRuleScope] = mapped_column(Enum(DonationRuleScope, native_enum=False), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    currency: Mapped[str] = mapped_column(String(3), default="USD")
    amount: Mapped[float] = mapped_column(default=5.0, nullable=False)

    priority: Mapped[int] = mapped_column(Integer, nullable=False)

    content_settings: Mapped[dict] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index(
            "ix_donation_rules_unique_trigger",
            "playlist_id",
            "platform",
            "currency",
            "amount",
            unique=True,
        ),
    )


class ChatRules(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "chat_rules"

    playlist_id: Mapped[UUID] = mapped_column(ForeignKey("playlists.id", ondelete="CASCADE"))
    playlist: Mapped["Playlist"] = relationship(
        back_populates="chat_rules",
        lazy="selectin",
    )
    platform: Mapped[ChatRuleScope] = mapped_column(Enum(ChatRuleScope, native_enum=False), nullable=False)

    key: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)

    content_settings: Mapped[dict] = mapped_column(JSONB, nullable=True)
    overrive_order: Mapped[int] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index(
            "ix_chat_rules_unique_trigger",
            "playlist_id",
            "platform",
            "key",
            unique=True,
        ),
    )
