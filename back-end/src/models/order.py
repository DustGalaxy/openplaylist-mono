from datetime import datetime
from typing import Any, Type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from src._types import Status, Platform


class WebExtraData(BaseModel):
    playlist_id: str


class YTExtraData(BaseModel):
    pass


class TTVExtraData(BaseModel):
    requester_id: int


class DAExtraData(BaseModel):
    requester_id: str
    donation_amount: float
    donation_currency: str


ExtraData = TTVExtraData | DAExtraData | YTExtraData | WebExtraData

STRATEGIES: dict[Platform, Type[ExtraData]] = {
    Platform.TWITCH: TTVExtraData,
    Platform.YOUTUBE: YTExtraData,
    Platform.WEB: WebExtraData,
    Platform.DA: DAExtraData,
}


class OrderDomain(BaseModel):
    id: UUID
    request_id: UUID
    owner_id: UUID
    from_owner: bool

    requester_nickname: str
    priority: str

    yt_video_id: str
    title: str
    duration: int
    views: int
    likes: int

    source: Platform

    extra_data: ExtraData

    created_at: datetime
    updated_at: datetime

    @model_validator(mode="before")
    @classmethod
    def apply_strategy(cls, data: Any) -> Any:
        # Извлекаем данные в зависимости от типа (dict или SA model)
        if isinstance(data, dict):
            source: str = data.get("source", "")
            extra_data = data.get("extra_data")
        else:
            source: str = getattr(data, "source", "")
            extra_data = getattr(data, "extra_data", None)

        strategy_class = STRATEGIES.get(Platform(source))
        if not strategy_class:
            raise ValueError(f"Unknown source strategy: {source}")

        if isinstance(extra_data, dict):
            validated_extra = strategy_class.model_validate(extra_data)
            if isinstance(data, dict):
                data["extra_data"] = validated_extra
            else:
                setattr(data, "extra_data", validated_extra)

        return data

    model_config = ConfigDict(from_attributes=True)


class OrderPatch(BaseModel):
    pass


class OrderCreate(BaseModel):
    request_id: UUID
    owner_id: UUID
    owner_platform_id: str
    from_owner: bool

    requester_id: str | None = None
    requester_nickname: str
    priority: str

    yt_video_id: str
    title: str
    duration: int
    views: int
    likes: int

    extra_data: ExtraData

    source: Platform
