import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel

from app.models.financial import PaymentMethod, PaymentStatus, ExpenseCategory


class PaymentCreate(BaseModel):
    order_id: uuid.UUID
    amount: Decimal
    method: PaymentMethod
    status: PaymentStatus = PaymentStatus.pending
    due_date: Optional[date] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    amount: Optional[Decimal] = None
    method: Optional[PaymentMethod] = None
    status: Optional[PaymentStatus] = None
    due_date: Optional[date] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    amount: Decimal
    method: PaymentMethod
    status: PaymentStatus
    due_date: Optional[date] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    order_number: Optional[str] = None

    model_config = {"from_attributes": True}


class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    description: str
    amount: Decimal
    date: date
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    date: Optional[date] = None
    notes: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    category: ExpenseCategory
    description: str
    amount: Decimal
    date: date
    notes: Optional[str] = None
    created_by: uuid.UUID
    created_at: datetime
    created_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class CashFlowItem(BaseModel):
    date: date
    revenue: Decimal
    expenses: Decimal
    balance: Decimal


class CashFlowResponse(BaseModel):
    items: list[CashFlowItem]
    total_revenue: Decimal
    total_expenses: Decimal
    total_balance: Decimal


class FinancialDashboardResponse(BaseModel):
    total_receivable: Decimal
    total_received: Decimal
    total_expenses: Decimal
    pending_payments: int
    revenue_vs_expenses: Decimal
