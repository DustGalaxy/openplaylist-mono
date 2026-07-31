from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base, TimestampMixin, UUIDMixin


class FeatureFlag(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "feature_flags"

    key: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)
    """Slug фичи. Примеры: 'playlist_sync_broadcast', 'theme_editor', 'profile_background_upload'."""

    min_tier: Mapped[int] = mapped_column(nullable=False)
    scope: Mapped[str] = mapped_column(nullable=False)
    """'user' | 'playlist' — чей тир резолвится при проверке. Не enum, документирующее поле."""

    label: Mapped[str] = mapped_column(nullable=False)
    is_enabled: Mapped[bool] = mapped_column(default=True, nullable=False)
    """Killswitch: фича временно выключена для всех независимо от tier."""
