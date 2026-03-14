from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, field_validator


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Literal["todo", "in_progress", "done"] = "todo"

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("title cannot be blank")
        if len(v) > 200:
            raise ValueError("title cannot exceed 200 characters")
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["todo", "in_progress", "done"]] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("title cannot be blank")
        return v


class TaskOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    owner_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
