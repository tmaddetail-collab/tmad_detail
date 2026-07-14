import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    in_progress = "in_progress"
    finished = "finished"
    cancelled = "cancelled"

class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("vehicles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointmentstatus"),
        default=AppointmentStatus.scheduled,
        nullable=False,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
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
    client: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="appointments_as_client", foreign_keys=[client_id]
    )
    vehicle: Mapped["Vehicle"] = relationship(  # noqa: F821
        "Vehicle", back_populates="appointments"
    )
    created_by_user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="appointments_created", foreign_keys=[created_by]
    )
    appointment_services: Mapped[list["AppointmentService"]] = relationship(
        "AppointmentService", back_populates="appointment", cascade="all, delete-orphan"
    )
    service_order: Mapped["ServiceOrder | None"] = relationship(  # noqa: F821
        "ServiceOrder", back_populates="appointment"
    )

    def __repr__(self) -> str:
        return f"<Appointment id={self.id} status={self.status} scheduled_at={self.scheduled_at}>"

class AppointmentService(Base):
    __tablename__ = "appointment_services"

    appointment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("appointments.id", ondelete="CASCADE"),
        primary_key=True,
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("services.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    price_at_time: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    appointment: Mapped["Appointment"] = relationship(
        "Appointment", back_populates="appointment_services"
    )
    service: Mapped["Service"] = relationship(  # noqa: F821
        "Service", back_populates="appointment_services"
    )
