import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Numeric, String, Text, func
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_time: Mapped[int] = mapped_column(nullable=False, comment="Duration in minutes")
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    appointment_services: Mapped[list["AppointmentService"]] = relationship(  # noqa: F821
        "AppointmentService", back_populates="service"
    )
    order_services: Mapped[list["OrderService"]] = relationship(  # noqa: F821
        "OrderService", back_populates="service"
    )

    def __repr__(self) -> str:
        return f"<Service id={self.id} name={self.name} price={self.price}>"
