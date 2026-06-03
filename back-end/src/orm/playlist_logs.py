# from datetime import datetime
# from uuid import UUID

# from sqlalchemy import ForeignKey, Index, func, event, DDL
# from sqlalchemy.dialects.postgresql import JSONB
# from sqlalchemy.orm import Mapped, mapped_column

# from src.database import Base, UUIDMixin


# class PlaylistLog(Base, UUIDMixin):
#     __tablename__ = "playlist_logs"

#     user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
#     playlist_id: Mapped[UUID] = mapped_column(ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False)

#     event_type: Mapped[str] = mapped_column(nullable=False)
#     event_data: Mapped[dict] = mapped_column(JSONB, nullable=True)

#     created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

#     __table_args__ = (Index("idx_playlist_logs_user_id_created_at", "playlist_id", "created_at DESC"),)


# trigger_snippet = DDL("""
# CREATE OR REPLACE FUNCTION clean_old_playlist_logs()
# RETURNS TRIGGER AS $$
# BEGIN
#     IF random() < 0.01 THEN
#         DELETE FROM playlist_logs
#         WHERE playlist_id = NEW.playlist_id 
#         AND id NOT IN (
#             SELECT id 
#             FROM playlist_logs 
#             WHERE playlist_id = NEW.playlist_id 
#             ORDER BY created_at DESC
#             LIMIT 1000
#         );
#     END IF;
#     RETURN NEW;
# END;
# $$ LANGUAGE plpgsql;

# CREATE OR REPLACE TRIGGER trg_clean_playlist_logs
# AFTER INSERT ON playlist_logs
# FOR EACH ROW
# EXECUTE FUNCTION clean_old_playlist_logs();
# """)

# event.listen(PlaylistLog.__table__, "after_create", trigger_snippet.execute_if(dialect="postgresql"))
