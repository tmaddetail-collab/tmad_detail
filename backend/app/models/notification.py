import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class NotificationType(str, enum.Enum):
    new_appointment = "new_appointment"
    confirmation = "confirmation"
    cancellation = "cancellation"
    service_finished = "service_finished"
    payment_received = "payment_received"

class NotificationChannel(str, enum.Enum):
    email = "email"
    whatsapp = "whatsapp"
    push = "push"

class NotificationStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notificationtype"), nullable=False
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notificationchannel"), nullable=False
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notificationstatus"),
        default=NotificationStatus.pending,
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="notifications"
    )

    def __repr__(self) -> str:
        return f"<Notification id={self.id} type={self.type} status={self.status}>"
