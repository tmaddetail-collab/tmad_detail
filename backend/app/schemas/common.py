from typing import Any, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response schema."""
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


class TokenResponse(BaseModel):
    """JWT token pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
