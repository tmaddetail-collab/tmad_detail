import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.appointment import AppointmentStatus


class AppointmentServiceCreate(BaseModel):
    service_id: uuid.UUID
    price_at_time: Decimal


class AppointmentCreate(BaseModel):
    client_id: uuid.UUID
    vehicle_id: uuid.UUID
    scheduled_at: datetime
    duration_minutes: int = 60
    notes: Optional[str] = None
    services: list[AppointmentServiceCreate] = []


class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    services: Optional[list[AppointmentServiceCreate]] = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentServiceStatusUpdate(BaseModel):
    completed: bool


class AppointmentServiceResponse(BaseModel):
    service_id: uuid.UUID
    price_at_time: Decimal
    completed: bool = False
    service_name: Optional[str] = None

    model_config = {"from_attributes": True}


class AppointmentResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    vehicle_id: uuid.UUID
    scheduled_at: datetime
    duration_minutes: int
    status: AppointmentStatus
    notes: Optional[str] = None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    client_name: Optional[str] = None
    vehicle_info: Optional[str] = None
    services: list[AppointmentServiceResponse] = []

    model_config = {"from_attributes": True}


class AppointmentSummary(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    vehicle_id: uuid.UUID
    scheduled_at: datetime
    status: AppointmentStatus
    client_name: Optional[str] = None
    vehicle_info: Optional[str] = None

    model_config = {"from_attributes": True}


class AvailableSlot(BaseModel):
    start: datetime
    end: datetime
