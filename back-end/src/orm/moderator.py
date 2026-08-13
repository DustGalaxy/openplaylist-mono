from datetime import datetime
from typing import final
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.associationproxy import AssociationProxy, association_proxy
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base, TimestampMixin, UUIDMixin
from src.orm.auth_user import User


def default_permissions():
    return {
        "can_manage_queue": True,
        "can_manage_playback": True,
        "can_manage_settings": False,
    }


@final
class PlaylistModerator(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "playlist_moderators"

    playlist_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
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

    permissions: Mapped[dict[str, bool]] = mapped_column(
        JSONB,
        nullable=False,
        default=default_permissions,
        server_default='{"can_manage_queue": true, "can_manage_playback": true, "can_manage_settings": false}',
    )

    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    playlist: Mapped["Playlist"] = relationship(back_populates="moderators")
    user: Mapped["User"] = relationship(lazy="selectin")
    user_name: AssociationProxy[str | None] = association_proxy("user", "username")

    __table_args__ = (Index("ix_playlist_moderators_playlist_user", "playlist_id", "user_id"),)
