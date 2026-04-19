from uuid import UUID
from sqlalchemy import Enum, String, ForeignKey
from sqlalchemy.ext.associationproxy import AssociationProxy, association_proxy
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ARRAY, UUID as PGUUID, JSONB

from database import Base, UUIDMixin, TimestampMixin
from _types import Status, Platform


class Order(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "orders"

    yt_video_id: Mapped[str]
    title: Mapped[str]
    duration: Mapped[int]
    views: Mapped[int]
    likes: Mapped[int]

    priority: Mapped[str]
    requester_nickname: Mapped[str]

    request_id: Mapped[UUID] = mapped_column(unique=True)
    owner_id: Mapped[UUID]
    from_owner: Mapped[bool]

    source: Mapped[Platform] = mapped_column(Enum(Platform), nullable=False)

    extra_data: Mapped[dict] = mapped_column(JSONB, nullable=True)

    playlist_associations: Mapped[list["OrderPlaylistStatus"]] = relationship(back_populates="order")


class Playlist(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "playlists"

    owner_id: Mapped[UUID] = mapped_column(PGUUID, nullable=False)
    owner_nickname: Mapped[str]
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)

    is_public: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_favorite: Mapped[bool] = mapped_column(default=False, nullable=False)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True, default=list)

    allow_sources: Mapped[list[Platform]] = mapped_column(ARRAY(Enum(Platform, native_enum=False)), nullable=True, default=list)
    is_allow_external_requests: Mapped[bool] = mapped_column(default=False, nullable=False)

    now_playing: Mapped[str] = mapped_column(String, nullable=True)

    order_associations: Mapped[list["OrderPlaylistStatus"]] = relationship(back_populates="playlist", lazy="selectin")

    active_order_associations: Mapped[list["OrderPlaylistStatus"]] = relationship(
        primaryjoin="and_(Playlist.id == OrderPlaylistStatus.playlist_id, OrderPlaylistStatus.status == 'in playlist')",
        viewonly=True,
        lazy="joined",
    )

    order_links: AssociationProxy[list["Order"]] = association_proxy(
        target_collection="order_associations", attr="order", creator=lambda obj: OrderPlaylistStatus(order=obj)
    )
    track_data: AssociationProxy[list["Order"]] = association_proxy(
        target_collection="active_order_associations", attr="order"
    )

    def __repr__(self):
        return f"<Playlist(id={self.id}, name='{self.name}', owner_id={self.owner_id} )>"


class OrderPlaylistStatus(Base, TimestampMixin):
    __tablename__ = "order_playlist_status"

    order_id: Mapped[UUID] = mapped_column(PGUUID, ForeignKey("orders.id"), primary_key=True)
    playlist_id: Mapped[UUID] = mapped_column(PGUUID, ForeignKey("playlists.id"), primary_key=True)
    status: Mapped[Status] = mapped_column(default="in playlist")

    order: Mapped["Order"] = relationship(back_populates="playlist_associations", lazy="selectin")
    playlist: Mapped["Playlist"] = relationship(back_populates="order_associations")
