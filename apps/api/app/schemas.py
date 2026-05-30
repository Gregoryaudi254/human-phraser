from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    id: int
    clerk_user_id: str
    email: str
    plan: str
    balance_words: int = 0
    plan_renews_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
