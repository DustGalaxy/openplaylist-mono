from typing import Literal
from uuid import UUID

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base, TimestampMixin, UUIDMixin


class Settings(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "settings"

    playlist_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("playlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    max_playlist_size: Mapped[int] = mapped_column(default=0, nullable=False)
    sync_playback_position: Mapped[bool] = mapped_column(default=False, nullable=False)

    mode: Mapped[Literal["flow", "static", "stream"]] = mapped_column(default="static", nullable=False)
    repeat_mode: Mapped[Literal["all", "once", "none"]] = mapped_column(default="none", nullable=False)
    shuffle: Mapped[bool] = mapped_column(default=False, nullable=False)

    mode_settings: Mapped[dict] = mapped_column(
        JSONB,
        default_factory=lambda: {
            "flow": {
                "priority_break_point": 0,
                "sort_settings_vip": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
                "sort_settings_regular": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
                "sort_settings_background": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
                "background_track_ids": [],
            },
            "static": {
                "priority_break_point": 0,
                "sort_settings_vip": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
                "sort_settings_regular": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
                "sort_settings_background": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
                "background_track_ids": [],
            },
            "stream": {
                "priority_break_point": 0,
                "sort_settings_vip": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
                "sort_settings_regular": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
                "sort_settings_background": {"date": "desc", "priority": "none", "order_mode": "auto", "manual_order_ids": []},
                "background_track_ids": [],
            },
        },
        nullable=False,
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
