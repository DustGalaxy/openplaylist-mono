"""add user favorite playlists and remove old is_favorite column

Revision ID: f9a8b7c6d5e4
Revises: efad6c67e7dc
Create Date: 2026-08-08 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f9a8b7c6d5e4"
down_revision: Union[str, Sequence[str], None] = "9376a16df26b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_favorite_playlists",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("playlist_id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlists.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "playlist_id", name="uq_user_favorite_playlist"),
    )
    op.create_index(op.f("ix_user_favorite_playlists_id"), "user_favorite_playlists", ["id"], unique=True)
    op.create_index(op.f("ix_user_favorite_playlists_user_id"), "user_favorite_playlists", ["user_id"], unique=False)
    op.create_index(op.f("ix_user_favorite_playlists_playlist_id"), "user_favorite_playlists", ["playlist_id"], unique=False)
    op.create_index("ix_user_favorite_playlists_user_created", "user_favorite_playlists", ["user_id", "created_at"], unique=False)

    # Drop obsolete is_favorite column from playlists table if it exists
    op.drop_column("playlists", "is_favorite")
    op.add_column("playlists", sa.Column("favorites_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("playlists", "favorites_count")
    op.add_column("playlists", sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.drop_index("ix_user_favorite_playlists_user_created", table_name="user_favorite_playlists")
    op.drop_index(op.f("ix_user_favorite_playlists_playlist_id"), table_name="user_favorite_playlists")
    op.drop_index(op.f("ix_user_favorite_playlists_user_id"), table_name="user_favorite_playlists")
    op.drop_index(op.f("ix_user_favorite_playlists_id"), table_name="user_favorite_playlists")
    op.drop_table("user_favorite_playlists")
