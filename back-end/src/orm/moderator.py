from datetime import datetime
from typing import TYPE_CHECKING, final
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.associationproxy import AssociationProxy, association_proxy
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base, TimestampMixin, UUIDMixin
from src.orm.auth_user import User

if TYPE_CHECKING:
    from src.orm.playlist import Playlist


@final
class ChannelModerator(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "channel_moderators"

    owner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    can_control_player: Mapped[bool] = mapped_column(default=True, nullable=False)
    can_manage_all_playlists: Mapped[bool] = mapped_column(default=False, nullable=False)

    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    owner: Mapped["User"] = relationship(foreign_keys=[owner_id], lazy="selectin")
    user: Mapped["User | None"] = relationship(foreign_keys=[user_id], lazy="selectin")
    user_name: AssociationProxy[str | None] = association_proxy("user", "username")

    playlist_access: Mapped[list["ModeratorPlaylistAccess"]] = relationship(
        back_populates="moderator", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (Index("ix_channel_moderators_owner_user", "owner_id", "user_id"),)


@final
class ModeratorPlaylistAccess(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "moderator_playlist_access"

    moderator_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("channel_moderators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    playlist_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    can_manage_tracks: Mapped[bool] = mapped_column(default=True, nullable=False)
    can_manage_settings: Mapped[bool] = mapped_column(default=False, nullable=False)

    moderator: Mapped["ChannelModerator"] = relationship(back_populates="playlist_access")
    playlist: Mapped["Playlist"] = relationship(back_populates="moderator_access", lazy="selectin")

    __table_args__ = (Index("ix_moderator_playlist_access_mod_plst", "moderator_id", "playlist_id", unique=True),)
