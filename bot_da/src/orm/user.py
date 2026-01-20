from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "user"

    id: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True, primary_key=True)
    da_id: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
