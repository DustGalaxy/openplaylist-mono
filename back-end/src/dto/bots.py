from pydantic import BaseModel


class BotConnectBody(BaseModel):
    platform_user_id: str


class UpdateBotSettingsBody(BaseModel):
    platform_user_id: str
    settings: dict
