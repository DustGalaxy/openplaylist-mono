"""update platform field lenght limit

Revision ID: 9376a16df26b
Revises: 5877b17e59cb
Create Date: 2026-08-06 12:42:44.916429

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from src._types import (
    BlockListScope,
    ContentSettingScope,
    DonationRuleScope,
    IntegrationPlatform,
    Platform,
)


# revision identifiers, used by Alembic.
revision: str = "9376a16df26b"
down_revision: Union[str, Sequence[str], None] = "5877b17e59cb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "block_list",
        "platform",
        existing_type=sa.VARCHAR(length=32),
        type_=sa.Enum(BlockListScope, native_enum=False, length=32),
        existing_nullable=False,
    )
    op.alter_column(
        "content_settings",
        "platform",
        existing_type=sa.VARCHAR(length=32),
        type_=sa.Enum(ContentSettingScope, native_enum=False, length=32),
        existing_nullable=False,
    )
    op.alter_column(
        "donation_rules",
        "platform",
        existing_type=sa.VARCHAR(length=32),
        type_=sa.Enum(DonationRuleScope, native_enum=False, length=32),
        existing_nullable=False,
    )
    op.alter_column(
        "linked_accounts",
        "platform",
        existing_type=sa.VARCHAR(length=32),
        type_=sa.Enum(IntegrationPlatform, native_enum=False, length=32),
        existing_nullable=False,
    )
    op.alter_column(
        "orders",
        "source",
        existing_type=sa.VARCHAR(length=32),
        type_=sa.Enum(Platform, native_enum=False, length=32),
        existing_nullable=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        "orders",
        "source",
        existing_type=sa.Enum(Platform, native_enum=False, length=32),
        type_=sa.VARCHAR(length=32),
        existing_nullable=False,
    )
    op.alter_column(
        "linked_accounts",
        "platform",
        existing_type=sa.Enum(IntegrationPlatform, native_enum=False, length=32),
        type_=sa.VARCHAR(length=32),
        existing_nullable=False,
    )
    op.alter_column(
        "donation_rules",
        "platform",
        existing_type=sa.Enum(DonationRuleScope, native_enum=False, length=32),
        type_=sa.VARCHAR(length=32),
        existing_nullable=False,
    )
    op.alter_column(
        "content_settings",
        "platform",
        existing_type=sa.Enum(ContentSettingScope, native_enum=False, length=32),
        type_=sa.VARCHAR(length=32),
        existing_nullable=False,
    )
    op.alter_column(
        "block_list",
        "platform",
        existing_type=sa.Enum(BlockListScope, native_enum=False, length=32),
        type_=sa.VARCHAR(length=32),
        existing_nullable=False,
    )
