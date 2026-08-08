# CREATE TABLE user_feedback (
#     id SERIAL PRIMARY KEY,
#     user_id INT NULL,                 -- NULL для анонимных ответов
#     rating INT CHECK (rating BETWEEN 1 AND 5), -- Оценка (звезды/NPS)
#     answers JSONB NOT NULL,           -- Динамические ответы: {"q1": "Ответ", "q2": "Текст"}
#     page_url VARCHAR(255),            -- С какой страницы отправлено
#     user_agent TEXT,                  -- Браузер/устройство
#     created_at TIMESTAMP DEFAULT NOW()
# );

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from pydantic import BaseModel
from pydantic.fields import Field
from uuid6 import uuid7


class FeedbackData(BaseModel):
    id: UUID = Field(default_factory=uuid7)

    user_nickname: str | None = Field(None)
    user_contact: str | None = Field(None)

    rating: int = Field(ge=0, le=10)

    feedback_text: str

    user_agent: str
    type: Literal["feedback", "bug_report"]

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
