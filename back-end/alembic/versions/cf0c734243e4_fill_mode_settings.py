"""fill mode settings

Revision ID: cf0c734243e4
Revises: caf85aa4f3c4
Create Date: 2026-07-23 10:57:08.733960

"""

import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "cf0c734243e4"
down_revision: Union[str, Sequence[str], None] = "caf85aa4f3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_MODE_SETTINGS = {
    "flow": {
        "priority_break_point": 0,
        "sort_settings_vip": {
            "date": "desc",
            "priority": "none",
            "order_mode": "auto",
            "manual_order_ids": [],
        },
        "sort_settings_regular": {
            "date": "desc",
            "priority": "none",
            "order_mode": "auto",
            "manual_order_ids": [],
        },
        "sort_settings_background": {
            "date": "desc",
            "priority": "none",
            "order_mode": "auto",
            "manual_order_ids": [],
        },
        "background_track_ids": [],
    },
    "static": {
        "priority_break_point": 0,
        "sort_settings_vip": {
            "date": "desc",
            "priority": "none",
            "order_mode": "auto",
            "manual_order_ids": [],
        },
        "sort_settings_regular": {
            "date": "desc",
            "priority": "none",
            "order_mode": "auto",
            "manual_order_ids": [],
        },
        "sort_settings_background": {
            "date": "desc",
            "priority": "none",
            "order_mode": "auto",
            "manual_order_ids": [],
        },
        "background_track_ids": [],
    },
    "stream": {
        "priority_break_point": 0,
        "sort_settings_vip": {
            "date": "desc",
            "priority": "none",
            "order_mode": "auto",
            "manual_order_ids": [],
        },
        "sort_settings_regular": {
            "date": "desc",
            "priority": "none",
            "order_mode": "auto",
            "manual_order_ids": [],
        },
        "sort_settings_background": {
            "date": "desc",
            "priority": "none",
            "order_mode": "auto",
            "manual_order_ids": [],
        },
        "background_track_ids": [],
    },
}

DEFAULT_JSON_STR = json.dumps(DEFAULT_MODE_SETTINGS)


def upgrade() -> None:
    # 1. Обновляем существующие записи со значениями '{}' или NULL на новый дефолт
    op.execute(
        sa.text(
            f"""
            UPDATE playlists
            SET mode_settings = '{DEFAULT_JSON_STR}'::jsonb
            WHERE mode_settings = '{{}}'::jsonb OR mode_settings IS NULL
            """
        )
    )

    # 2. Убеждаемся, что в базе сброшен server_default (если нужно управлять им через ORM)
    op.alter_column("playlists", "mode_settings", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    pass
