import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    cpf: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres")
        return v

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    cpf: Optional[str] = None
    avatar_url: Optional[str] = None


class UserAdminUpdate(UserUpdate):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    cpf: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserSummary(BaseModel):
    """Minimal user info for embedding in other responses."""
    id: uuid.UUID
    name: str
    email: str
    cpf: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
