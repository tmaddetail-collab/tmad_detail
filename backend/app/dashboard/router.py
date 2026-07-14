from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.order import ServiceOrder, OrderStatus
from app.models.appointment import Appointment, AppointmentStatus
from app.models.financial import Payment, PaymentStatus, Expense
from app.auth.deps import get_current_admin, get_current_user
from app.schemas.dashboard import AdminDashboardResponse, ClientDashboardResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/admin", response_model=AdminDashboardResponse)
async def admin_dashboard(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_clients = (await db.execute(select(func.count(User.id)).where(User.role == UserRole.client))).scalar() or 0
    total_vehicles = (await db.execute(select(func.count(Vehicle.id)))).scalar() or 0
    active_orders = (await db.execute(
        select(func.count(ServiceOrder.id)).where(ServiceOrder.status.in_([OrderStatus.open, OrderStatus.in_progress]))
    )).scalar() or 0

    today = date.today()
    today_appointments = (await db.execute(
        select(func.count(Appointment.id))
        .where(
            func.date(Appointment.scheduled_at) == today,
            Appointment.status != AppointmentStatus.cancelled,
        )
    )).scalar() or 0

    current_month = today.month
    current_year = today.year

    monthly_revenue = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(
            extract("month", Payment.paid_at) == current_month,
            extract("year", Payment.paid_at) == current_year,
            Payment.status == PaymentStatus.paid,
        )
    )
    monthly_revenue = Decimal(str(monthly_revenue.scalar()))

    monthly_expenses = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(
            extract("month", Expense.date) == current_month,
            extract("year", Expense.date) == current_year,
        )
    )
    monthly_expenses = Decimal(str(monthly_expenses.scalar()))

    pending_approvals = (await db.execute(
        select(func.count(ServiceOrder.id)).where(ServiceOrder.client_signature.is_(None))
    )).scalar() or 0

    return AdminDashboardResponse(
        total_clients=total_clients,
        total_vehicles=total_vehicles,
        active_orders=active_orders,
        today_appointments=today_appointments,
        monthly_revenue=monthly_revenue,
        monthly_expenses=monthly_expenses,
        pending_approvals=pending_approvals,
    )


@router.get("/client", response_model=ClientDashboardResponse)
async def client_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_vehicles = (await db.execute(
        select(func.count(Vehicle.id)).where(Vehicle.owner_id == current_user.id)
    )).scalar() or 0

    now = datetime.now(timezone.utc)
    upcoming_appointments = (await db.execute(
        select(func.count(Appointment.id))
        .where(
            Appointment.client_id == current_user.id,
            Appointment.scheduled_at >= now,
            Appointment.status != AppointmentStatus.cancelled,
        )
    )).scalar() or 0

    active_orders = (await db.execute(
        select(func.count(ServiceOrder.id))
        .where(
            ServiceOrder.client_id == current_user.id,
            ServiceOrder.status.in_([OrderStatus.open, OrderStatus.in_progress]),
        )
    )).scalar() or 0

    total_spent = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .select_from(Payment)
        .join(ServiceOrder, Payment.order_id == ServiceOrder.id)
        .where(
            ServiceOrder.client_id == current_user.id,
            Payment.status == PaymentStatus.paid,
        )
    )
    total_spent = Decimal(str(total_spent.scalar()))

    return ClientDashboardResponse(
        total_vehicles=total_vehicles,
        upcoming_appointments=upcoming_appointments,
        active_orders=active_orders,
        total_spent=total_spent,
    )
