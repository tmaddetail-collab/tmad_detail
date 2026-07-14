from decimal import Decimal
from pydantic import BaseModel


class TopClientItem(BaseModel):
    client_id: str
    client_name: str
    total_orders: int
    total_spent: Decimal


class TopServiceItem(BaseModel):
    service_id: str
    service_name: str
    total_quantity: int
    total_revenue: Decimal


class RevenueItem(BaseModel):
    period: str
    revenue: Decimal
    expenses: Decimal = Decimal("0.00")
    profit: Decimal = Decimal("0.00")


class PendingPaymentItem(BaseModel):
    payment_id: str
    order_number: str
    client_name: str
    amount: Decimal
    due_date: str
    days_overdue: int


class AppointmentReportItem(BaseModel):
    period: str
    total: int
    finished: int
    cancelled: int
    conversion_rate: float
