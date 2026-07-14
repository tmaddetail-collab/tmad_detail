import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class OrderStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    finished = "finished"
    cancelled = "cancelled"

class PhotoType(str, enum.Enum):
    before = "before"
    after = "after"

class ServiceOrder(Base):
    __tablename__ = "service_orders"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    order_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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
    responsible_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    total_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="orderstatus"),
        default=OrderStatus.open,
        nullable=False,
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_signature: Mapped[str | None] = mapped_column(Text, nullable=True, comment="Base64 encoded signature")
    client_approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    client_observations: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    appointment: Mapped["Appointment | None"] = relationship(  # noqa: F821
        "Appointment", back_populates="service_order"
    )
    client: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="orders_as_client", foreign_keys=[client_id]
    )
    vehicle: Mapped["Vehicle"] = relationship(  # noqa: F821
        "Vehicle", back_populates="orders"
    )
    responsible: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="orders_responsible", foreign_keys=[responsible_id]
    )
    order_vehicles: Mapped[list["OrderVehicle"]] = relationship(
        "OrderVehicle", back_populates="order", cascade="all, delete-orphan"
    )
    order_services: Mapped[list["OrderService"]] = relationship(
        "OrderService", back_populates="order", cascade="all, delete-orphan"
    )
    checklist_items: Mapped[list["ChecklistItem"]] = relationship(  # noqa: F821
        "ChecklistItem", back_populates="order", cascade="all, delete-orphan"
    )
    photos: Mapped[list["OrderPhoto"]] = relationship(
        "OrderPhoto", back_populates="order", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(  # noqa: F821
        "Payment", back_populates="order", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ServiceOrder id={self.id} order_number={self.order_number} status={self.status}>"

class OrderVehicle(Base):
    __tablename__ = "order_vehicles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("service_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("vehicles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    order: Mapped["ServiceOrder"] = relationship("ServiceOrder", back_populates="order_vehicles")
    vehicle: Mapped["Vehicle"] = relationship(  # noqa: F821
        "Vehicle", back_populates="order_vehicles"
    )
    order_services: Mapped[list["OrderService"]] = relationship(
        "OrderService", back_populates="order_vehicle", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<OrderVehicle id={self.id} order_id={self.order_id} vehicle_id={self.vehicle_id}>"

class OrderService(Base):
    __tablename__ = "order_services"

    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("service_orders.id", ondelete="CASCADE"),
        primary_key=True,
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("services.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    order_vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("order_vehicles.id", ondelete="CASCADE"),
        nullable=True,
        primary_key=True,
    )
    price_at_time: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    order: Mapped["ServiceOrder"] = relationship("ServiceOrder", back_populates="order_services")
    service: Mapped["Service"] = relationship(  # noqa: F821
        "Service", back_populates="order_services"
    )
    order_vehicle: Mapped["OrderVehicle | None"] = relationship(
        "OrderVehicle", back_populates="order_services"
    )

class OrderPhoto(Base):
    __tablename__ = "order_photos"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("service_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[PhotoType] = mapped_column(
        Enum(PhotoType, name="phototype"), nullable=False
    )
    url: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    order: Mapped["ServiceOrder"] = relationship("ServiceOrder", back_populates="photos")

    def __repr__(self) -> str:
        return f"<OrderPhoto id={self.id} order_id={self.order_id} type={self.type}>"
