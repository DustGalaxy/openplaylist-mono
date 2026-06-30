from uuid import UUID

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class StreamToken(Base):
    __tablename__ = "stream_token"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(), nullable=False)
