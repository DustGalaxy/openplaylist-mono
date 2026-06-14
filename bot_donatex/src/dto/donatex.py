from datetime import datetime
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
    with_ai_response: bool = Field(alias="withAIResponse")
    music_link: str | None
    currency: str
    amount: float
    amount_in_rub: float
    timestamp: datetime
    ai_response: str | None
    was_shown: bool
    is_test: bool
    is_potentially_unsafe: bool
    is_fee_paid_by_user: bool
    voice_file_path: HttpUrl | str | None
    paid_voice: str | None
