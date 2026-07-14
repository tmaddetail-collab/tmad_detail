import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.checklist import ChecklistStatus


class ChecklistItemCreate(BaseModel):
    section: str
    item: str
    status: ChecklistStatus = ChecklistStatus.not_checked
    notes: Optional[str] = None
    photo_url: Optional[str] = None


class ChecklistItemUpdate(BaseModel):
    status: Optional[ChecklistStatus] = None
    notes: Optional[str] = None
    photo_url: Optional[str] = None


class ChecklistItemResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    section: str
    item: str
    status: ChecklistStatus
    notes: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChecklistGroupedResponse(BaseModel):
    section: str
    items: list[ChecklistItemResponse]


class ChecklistResponse(BaseModel):
    order_id: uuid.UUID
    sections: list[ChecklistGroupedResponse]
