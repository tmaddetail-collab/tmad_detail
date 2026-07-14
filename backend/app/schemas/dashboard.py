from decimal import Decimal
from pydantic import BaseModel


class AdminDashboardResponse(BaseModel):
    total_clients: int
    total_vehicles: int
    active_orders: int
    today_appointments: int
    monthly_revenue: Decimal
    monthly_expenses: Decimal
    pending_approvals: int


class ClientDashboardResponse(BaseModel):
    total_vehicles: int
    upcoming_appointments: int
    active_orders: int
    total_spent: Decimal
