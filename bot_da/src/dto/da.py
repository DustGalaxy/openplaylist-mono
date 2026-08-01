from pydantic import BaseModel

# {
#     "id": 171664512,
#     "name": "Donations",
#     "username": "я",
#     "message": "тест",
#     "message_type": "text",
#     "payin_system": None,
#     "amount": 1,
#     "currency": "UAH",
#     "is_shown": 0,
#     "amount_in_user_currency": 1,
#     "recipient_name": "dustgalaxy",
#     "recipient": {
#         "user_id": 1772371,
#         "code": "dustgalaxy",
#         "name": "dustgalaxy",
#         "avatar": "https://static-cdn.jtvnw.net/jtv_user_pictures/201d56f4-e6ed-4ad2-b87f-5c572f657e6d-profile_image-300x300.png",
#     },
#     "created_at": "2025-08-30 11:00:00",
#     "shown_at": None,
#     "reason": "default",
# }


class Recipient(BaseModel):
    user_id: int
    code: str
    name: str
    avatar: str


class DonationData(BaseModel):
    id: int
    name: str
    username: str
    message: str
    message_type: str
    payin_system: str | None
    amount: float
    currency: str
    is_shown: int
    amount_in_user_currency: float
    recipient_name: str
    recipient: Recipient
    created_at: str
    shown_at: str | None
    reason: str
