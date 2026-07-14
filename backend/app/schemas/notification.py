import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.notification import NotificationType, NotificationChannel, NotificationStatus


class NotificationSendRequest(BaseModel):
    user_id: uuid.UUID
    type: NotificationType
    channel: NotificationChannel = NotificationChannel.push
    title: str
    message: str


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: NotificationType
    channel: NotificationChannel
    status: NotificationStatus
    title: str
    message: str
    sent_at: Optional[datetime] = None
    created_at: datetime
    read: bool = False

    model_config = {"from_attributes": True}


class NotificationReadResponse(BaseModel):
    message: str
