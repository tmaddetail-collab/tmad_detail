import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class VehicleCreate(BaseModel):
    brand: str
    model: str
    year: int
    color: str
    plate: str
    mileage: int = 0
    notes: Optional[str] = None
    owner_id: Optional[uuid.UUID] = None  # Admin can specify owner; client uses their own id

    @field_validator("year")
    @classmethod
    def validate_year(cls, v: int) -> int:
        if v < 1900 or v > 2100:
            raise ValueError("Ano do veículo inválido")
        return v

    @field_validator("plate")
    @classmethod
    def normalize_plate(cls, v: str) -> str:
        return v.upper().strip()


class VehicleUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    plate: Optional[str] = None
    mileage: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("plate", mode="before")
    @classmethod
    def normalize_plate(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return v.upper().strip()


class VehicleResponse(BaseModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    brand: str
    model: str
    year: int
    color: str
    plate: str
    mileage: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VehicleSummary(BaseModel):
    """Minimal vehicle info for embedding in other responses."""
    id: uuid.UUID
    owner_id: uuid.UUID
    brand: str
    model: str
    year: int
    color: str
    plate: str
    mileage: int = 0
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
