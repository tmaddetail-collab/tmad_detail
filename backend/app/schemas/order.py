import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.order import OrderStatus, PhotoType


class OrderVehicleCreate(BaseModel):
    vehicle_id: uuid.UUID
    notes: Optional[str] = None


class OrderServiceCreate(BaseModel):
    service_id: uuid.UUID
    price_at_time: Decimal
    quantity: int = 1
    order_vehicle_id: Optional[uuid.UUID] = None
    vehicle_idx: Optional[int] = None


class OrderCreate(BaseModel):
    appointment_id: Optional[uuid.UUID] = None
    client_id: uuid.UUID
    vehicles: list[OrderVehicleCreate]
    responsible_id: uuid.UUID
    notes: Optional[str] = None
    services: list[OrderServiceCreate] = []


class OrderUpdate(BaseModel):
    notes: Optional[str] = None
    client_observations: Optional[str] = None
    services: Optional[list[OrderServiceCreate]] = None
    vehicles: Optional[list[OrderVehicleCreate]] = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderApprove(BaseModel):
    signature: str
    observations: Optional[str] = None


class OrderVehicleResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    notes: Optional[str] = None
    vehicle_info: Optional[str] = None

    model_config = {"from_attributes": True}


class OrderServiceResponse(BaseModel):
    service_id: uuid.UUID
    price_at_time: Decimal
    quantity: int
    service_name: Optional[str] = None
    order_vehicle_id: Optional[uuid.UUID] = None
    vehicle_info: Optional[str] = None

    model_config = {"from_attributes": True}


class OrderPhotoResponse(BaseModel):
    id: uuid.UUID
    type: PhotoType
    url: str
    filename: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    appointment_id: Optional[uuid.UUID] = None
    appointment_scheduled_at: Optional[datetime] = None
    client_id: uuid.UUID
    vehicle_id: uuid.UUID
    responsible_id: uuid.UUID
    total_value: Decimal
    status: OrderStatus
    notes: Optional[str] = None
    client_signature: Optional[str] = None
    client_approved_at: Optional[datetime] = None
    client_observations: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    client_name: Optional[str] = None
    vehicle_info: Optional[str] = None
    responsible_name: Optional[str] = None
    vehicles: list[OrderVehicleResponse] = []
    services: list[OrderServiceResponse] = []
    photos: list[OrderPhotoResponse] = []

    model_config = {"from_attributes": True}


class OrderSummary(BaseModel):
    id: uuid.UUID
    order_number: str
    client_id: uuid.UUID
    vehicle_id: uuid.UUID
    total_value: Decimal
    status: OrderStatus
    created_at: datetime
    appointment_scheduled_at: Optional[datetime] = None
    client_name: Optional[str] = None
    vehicle_info: Optional[str] = None

    model_config = {"from_attributes": True}
