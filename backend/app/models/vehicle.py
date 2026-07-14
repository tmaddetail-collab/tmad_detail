import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    brand: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    color: Mapped[str] = mapped_column(String(50), nullable=False)
    plate: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    mileage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    owner: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="vehicles", foreign_keys=[owner_id]
    )
    appointments: Mapped[list["Appointment"]] = relationship(  # noqa: F821
        "Appointment", back_populates="vehicle"
    )
    orders: Mapped[list["ServiceOrder"]] = relationship(  # noqa: F821
        "ServiceOrder", back_populates="vehicle"
    )
    order_vehicles: Mapped[list["OrderVehicle"]] = relationship(  # noqa: F821
        "OrderVehicle", back_populates="vehicle"
    )

    def __repr__(self) -> str:
        return f"<Vehicle id={self.id} plate={self.plate} model={self.model}>"
