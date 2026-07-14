from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select, func, extract, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.service import Service
from app.models.order import ServiceOrder, OrderService, OrderStatus
from app.models.appointment import Appointment, AppointmentStatus
from app.models.financial import Payment, PaymentStatus, Expense
from app.auth.deps import get_current_admin
from app.schemas.report import (
    TopClientItem,
    TopServiceItem,
    RevenueItem,
    PendingPaymentItem,
    AppointmentReportItem,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/top-clients", response_model=list[TopClientItem])
async def top_clients(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            ServiceOrder.client_id,
            func.count(ServiceOrder.id).label("total_orders"),
            func.sum(ServiceOrder.total_value).label("total_spent"),
        )
        .group_by(ServiceOrder.client_id)
        .order_by(func.sum(ServiceOrder.total_value).desc())
        .limit(limit)
    )
    rows = result.all()

    items = []
    for row in rows:
        client = await db.execute(select(User).where(User.id == row.client_id))
        client = client.scalar_one_or_none()
        items.append(TopClientItem(
            client_id=str(row.client_id),
            client_name=client.name if client else "Desconhecido",
            total_orders=row.total_orders,
            total_spent=Decimal(str(row.total_spent or 0)),
        ))
    return items


@router.get("/top-services", response_model=list[TopServiceItem])
async def top_services(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            OrderService.service_id,
            func.sum(OrderService.quantity).label("total_quantity"),
            func.sum(OrderService.price_at_time * OrderService.quantity).label("total_revenue"),
        )
        .group_by(OrderService.service_id)
        .order_by(func.sum(OrderService.price_at_time * OrderService.quantity).desc())
        .limit(limit)
    )
    rows = result.all()

    items = []
    for row in rows:
        svc = await db.execute(select(Service).where(Service.id == row.service_id))
        svc = svc.scalar_one_or_none()
        items.append(TopServiceItem(
            service_id=str(row.service_id),
            service_name=svc.name if svc else "Desconhecido",
            total_quantity=row.total_quantity,
            total_revenue=Decimal(str(row.total_revenue or 0)),
        ))
    return items


@router.get("/revenue", response_model=list[RevenueItem])
async def revenue_report(
    year: int = Query(date.today().year),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    revenue_rows = await db.execute(
        select(
            extract("month", Payment.paid_at).label("month"),
            func.sum(Payment.amount).label("total"),
        )
        .where(
            extract("year", Payment.paid_at) == year,
            Payment.status == PaymentStatus.paid,
        )
        .group_by(extract("month", Payment.paid_at))
        .order_by(extract("month", Payment.paid_at))
    )

    expense_rows = await db.execute(
        select(
            extract("month", Expense.date).label("month"),
            func.sum(Expense.amount).label("total"),
        )
        .where(extract("year", Expense.date) == year)
        .group_by(extract("month", Expense.date))
        .order_by(extract("month", Expense.date))
    )

    expense_map = {}
    for row in expense_rows.all():
        expense_map[int(row.month)] = Decimal(str(row.total or 0))

    months_map = {
        1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
    }

    items = []
    for row in revenue_rows.all():
        month_num = int(row.month)
        month_name = months_map.get(month_num, str(month_num))
        rev = Decimal(str(row.total or 0))
        exp = expense_map.get(month_num, Decimal("0.00"))
        items.append(RevenueItem(
            period=month_name,
            revenue=rev,
            expenses=exp,
            profit=rev - exp,
        ))
    return items


@router.get("/pending-payments", response_model=list[PendingPaymentItem])
async def pending_payments_report(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    result = await db.execute(
        select(Payment).options(selectinload(Payment.order).selectinload(ServiceOrder.client))
        .where(Payment.status.in_([PaymentStatus.pending, PaymentStatus.overdue]))
        .order_by(Payment.due_date.asc())
    )
    payments = result.scalars().all()

    items = []
    for p in payments:
        days_overdue = 0
        if p.due_date and p.due_date < today:
            days_overdue = (today - p.due_date).days
        items.append(PendingPaymentItem(
            payment_id=str(p.id),
            order_number=p.order.order_number if p.order else "N/A",
            client_name=p.order.client.name if p.order and p.order.client else "N/A",
            amount=p.amount,
            due_date=p.due_date.isoformat() if p.due_date else "",
            days_overdue=days_overdue,
        ))
    return items


@router.get("/appointments", response_model=list[AppointmentReportItem])
async def appointments_report(
    year: int = Query(date.today().year),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            extract("month", Appointment.scheduled_at).label("month"),
            func.count(Appointment.id).label("total"),
            func.sum(case((Appointment.status == AppointmentStatus.finished, 1), else_=0)).label("finished"),
            func.sum(case((Appointment.status == AppointmentStatus.cancelled, 1), else_=0)).label("cancelled"),
        )
        .where(extract("year", Appointment.scheduled_at) == year)
        .group_by(extract("month", Appointment.scheduled_at))
        .order_by(extract("month", Appointment.scheduled_at))
    )
    rows = result.all()

    months_map = {
        1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
    }
    items = []
    for row in rows:
        total = row.total or 0
        finished = row.finished or 0
        cancelled = row.cancelled or 0
        conversion_rate = (finished / total * 100) if total > 0 else 0.0
        items.append(AppointmentReportItem(
            period=months_map.get(int(row.month), str(int(row.month))),
            total=total,
            finished=finished,
            cancelled=cancelled,
            conversion_rate=round(conversion_rate, 2),
        ))
    return items
