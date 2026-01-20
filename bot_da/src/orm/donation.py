from typing import Literal

from sqlalchemy.orm import Mapped, mapped_column

from database import Base, TimestampMixin

Status = Literal["processing", "completed", "cancelled"]


class Donation(Base, TimestampMixin):
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str]

    status: Mapped[Status]
