from pydantic import BaseModel, Field


class Recipient(BaseModel):
    user_id: int
    code: str = ""
    name: str = ""
    avatar: str | None = None


class DonationData(BaseModel):
    id: int
    name: str = "Donations"
    username: str = "Anonymous"
    message: str = ""
    message_type: str = "text"
    payin_system: str | None = None
    amount: float = 0.0
    currency: str = "RUB"
    is_shown: int = 0
    amount_in_user_currency: float = 0.0
    recipient_name: str = ""
    recipient: Recipient
    created_at: str = ""
    shown_at: str | None = None
    reason: str = "default"
