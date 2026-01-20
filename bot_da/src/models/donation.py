from datetime import datetime
from typing import Literal
from pydantic import BaseModel

Status = Literal["processing", "completed", "cancelled"]


class Donation(BaseModel):
    id: int
    user_id: str

    status: Status

    created_at: datetime
    updated_at: datetime


class DonationCreate(BaseModel):
    id: int
    user_id: str

    status: Status = "processing"


class DonationPatch(BaseModel):
    status: Status
