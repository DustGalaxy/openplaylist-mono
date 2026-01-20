from uuid import UUID

from sqlalchemy.orm import Mapped, mapped_column

from database import Base, UUIDMixin, TimestampMixin
from _types import Source, Status


class Order(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "orders"
    owner_id: Mapped[UUID]

    requester_nickname: Mapped[str]
    playlist_name: Mapped[str]

    donation_currency_amount: Mapped[float]

    yt_video_id: Mapped[str]
    priority: Mapped[str]
    title: Mapped[str]
    duration: Mapped[int]

    views: Mapped[int]
    likes: Mapped[int]

    request_id: Mapped[UUID] = mapped_column(unique=True)

    source: Mapped[Source]
    status: Mapped[Status] = mapped_column(default="processing")
