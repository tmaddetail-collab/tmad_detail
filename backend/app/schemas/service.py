import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class ServiceCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    estimated_time: int
    price: Decimal


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    estimated_time: Optional[int] = None
    price: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ServiceResponse(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    description: Optional[str] = None
    estimated_time: int
    price: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ServiceSummary(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    description: Optional[str] = None
    estimated_time: int
    price: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
