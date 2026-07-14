import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class ChecklistStatus(str, enum.Enum):
    ok = "ok"
    attention = "attention"
    damaged = "damaged"
    not_checked = "not_checked"

class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("service_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="externo/interno/geral"
    )
    item: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[ChecklistStatus] = mapped_column(
        Enum(ChecklistStatus, name="checkliststatus"),
        default=ChecklistStatus.not_checked,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
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
    order: Mapped["ServiceOrder"] = relationship(  # noqa: F821
        "ServiceOrder", back_populates="checklist_items"
    )

    def __repr__(self) -> str:
        return f"<ChecklistItem id={self.id} section={self.section} item={self.item} status={self.status}>"
