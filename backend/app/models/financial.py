import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class PaymentMethod(str, enum.Enum):
    cash = "cash"
    pix = "pix"
    credit_card = "credit_card"
    debit_card = "debit_card"
    transfer = "transfer"
    other = "other"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"

class ExpenseCategory(str, enum.Enum):
    products = "products"
    equipment = "equipment"
    staff = "staff"
    operational = "operational"
    other = "other"

class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("service_orders.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="paymentmethod"), nullable=False
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="paymentstatus"),
        default=PaymentStatus.pending,
        nullable=False,
        index=True,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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
    order: Mapped["ServiceOrder"] = relationship(  # noqa: F821
        "ServiceOrder", back_populates="payments"
    )

    def __repr__(self) -> str:
        return f"<Payment id={self.id} amount={self.amount} status={self.status}>"

class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory, name="expensecategory"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    created_by_user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="expenses"
    )

    def __repr__(self) -> str:
        return f"<Expense id={self.id} category={self.category} amount={self.amount}>"
