import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    String,
    func,
)
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class UserRole(str, enum.Enum):
    client = "client"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    cpf: Mapped[str | None] = mapped_column(String(14), unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole"), default=UserRole.client, nullable=False
    )
    google_id: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    vehicles: Mapped[list["Vehicle"]] = relationship(  # noqa: F821
        "Vehicle", back_populates="owner", foreign_keys="Vehicle.owner_id"
    )
    appointments_as_client: Mapped[list["Appointment"]] = relationship(  # noqa: F821
        "Appointment", back_populates="client", foreign_keys="Appointment.client_id"
    )
    appointments_created: Mapped[list["Appointment"]] = relationship(  # noqa: F821
        "Appointment", back_populates="created_by_user", foreign_keys="Appointment.created_by"
    )
    orders_as_client: Mapped[list["ServiceOrder"]] = relationship(  # noqa: F821
        "ServiceOrder", back_populates="client", foreign_keys="ServiceOrder.client_id"
    )
    orders_responsible: Mapped[list["ServiceOrder"]] = relationship(  # noqa: F821
        "ServiceOrder", back_populates="responsible", foreign_keys="ServiceOrder.responsible_id"
    )
    expenses: Mapped[list["Expense"]] = relationship(  # noqa: F821
        "Expense", back_populates="created_by_user"
    )
    notifications: Mapped[list["Notification"]] = relationship(  # noqa: F821
        "Notification", back_populates="user"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(  # noqa: F821
        "AuditLog", back_populates="user"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
