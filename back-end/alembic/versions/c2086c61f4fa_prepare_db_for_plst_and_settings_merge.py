"""prepare db for plst and settings merge

Revision ID: c2086c61f4fa
Revises: 5ab9eb59af00
Create Date: 2026-07-23 10:15:43.295930

"""

from typing import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c2086c61f4fa"
down_revision: str | Sequence[str] | None = "5ab9eb59af00"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = ["content_settings", "block_list", "donation_rules", "chat_rules"]


def _drop_fk_for_column(table_name: str, column_name: str) -> None:
    """Находит и удаляет любой FK, привязанный к указанной колонке."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    foreign_keys = inspector.get_foreign_keys(table_name)

    for fk in foreign_keys:
        if column_name in fk["constrained_columns"]:
            op.drop_constraint(fk["name"], table_name, type_="foreignkey")


def upgrade() -> None:
    # 1. Добавляем временную колонку tmp_playlist_id
    for table in TABLES:
        op.add_column(table, sa.Column("tmp_playlist_id", sa.UUID(), nullable=True))

    # 2. Переносим данные из settings.playlist_id
    for table in TABLES:
        op.execute(
            sa.text(
                f"""
                UPDATE {table}
                SET tmp_playlist_id = settings.playlist_id
                FROM settings
                WHERE {table}.settings_id = settings.id
                """
            )
        )

    # 3. Автоматически находим и удаляем FK на settings_id
    for table in TABLES:
        _drop_fk_for_column(table, "settings_id")

    # 4. Дропаем старые уникальные индексы
    op.drop_index(
        "ix_donation_rules_unique_trigger",
        table_name="donation_rules",
        if_exists=True,
    )
    op.drop_index(
        "ix_chat_rules_unique_trigger",
        table_name="chat_rules",
        if_exists=True,
    )

    # 5. Заменяем колонки
    for table in TABLES:
        op.drop_column(table, "settings_id")
        op.alter_column(
            table,
            "tmp_playlist_id",
            new_column_name="playlist_id",
            nullable=False,
        )

    # 6. Навешиваем новые FK
    for table in TABLES:
        op.create_foreign_key(
            constraint_name=f"fk_{table}_playlist_id_playlist",
            source_table=table,
            referent_table="playlists",
            local_cols=["playlist_id"],
            remote_cols=["id"],
            ondelete="CASCADE",
        )

    # 7. Пересоздаем индексы
    op.create_index(
        "ix_donation_rules_unique_trigger",
        "donation_rules",
        ["playlist_id", "platform", "currency", "amount"],
        unique=True,
    )
    op.create_index(
        "ix_chat_rules_unique_trigger",
        "chat_rules",
        ["playlist_id", "platform", "key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_chat_rules_unique_trigger", table_name="chat_rules")
    op.drop_index("ix_donation_rules_unique_trigger", table_name="donation_rules")

    for table in TABLES:
        op.drop_constraint(f"fk_{table}_playlists_id_playlist", table, type_="foreignkey")

    for table in TABLES:
        op.add_column(table, sa.Column("tmp_settings_id", sa.UUID(), nullable=True))

    for table in TABLES:
        op.execute(
            sa.text(
                f"""
                UPDATE {table}
                SET tmp_settings_id = settings.id
                FROM settings
                WHERE {table}.playlist_id = settings.playlist_id
                """
            )
        )

    for table in TABLES:
        op.drop_column(table, "playlist_id")
        op.alter_column(
            table,
            "tmp_settings_id",
            new_column_name="settings_id",
            nullable=False,
        )

    for table in TABLES:
        op.create_foreign_key(
            constraint_name=f"fk_{table}_settings_id_settings",
            source_table=table,
            referent_table="settings",
            local_cols=["settings_id"],
            remote_cols=["id"],
            ondelete="CASCADE",
        )

    op.create_index(
        "ix_donation_rules_unique_trigger",
        "donation_rules",
        ["settings_id", "platform", "currency", "amount"],
        unique=True,
    )
    op.create_index(
        "ix_chat_rules_unique_trigger",
        "chat_rules",
        ["settings_id", "platform", "key"],
        unique=True,
    )
