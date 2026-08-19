from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, ConfigDict, HttpUrl
from pydantic.alias_generators import to_camel
from pydantic.fields import Field


class DonationData(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: UUID
    username: str
    message: str
    currency: str
    amount: float
    amount_in_rub: float = 0.0
    with_ai_response: bool = Field(default=False, alias="withAIResponse")
    music_link: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ai_response: str | None = None
    was_shown: bool = False
    is_test: bool = False
    is_potentially_unsafe: bool = False
    is_fee_paid_by_user: bool = False
    voice_file_path: HttpUrl | str | None = None
    paid_voice: str | None = None
