import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func, and_, extract, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.order import ServiceOrder
from app.models.financial import Payment, Expense, PaymentStatus, ExpenseCategory
from app.models.audit import AuditLog
from app.auth.deps import get_current_admin, get_current_user
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.financial import (
    PaymentCreate,
    PaymentUpdate,
    PaymentResponse,
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    CashFlowItem,
    CashFlowResponse,
    FinancialDashboardResponse,
)

router = APIRouter(prefix="/financial", tags=["Financial"])


@router.get("/payments", response_model=PaginatedResponse[PaymentResponse])
async def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[PaymentStatus] = Query(None, alias="status"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    order_id: Optional[uuid.UUID] = Query(None),
    client_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Payment).options(selectinload(Payment.order))
    count_query = select(func.count(Payment.id))

    if current_user.role != UserRole.admin:
        query = query.join(ServiceOrder, Payment.order_id == ServiceOrder.id).where(ServiceOrder.client_id == current_user.id)
        count_query = count_query.join(ServiceOrder, Payment.order_id == ServiceOrder.id).where(ServiceOrder.client_id == current_user.id)

    if status_filter:
        query = query.where(Payment.status == status_filter)
        count_query = count_query.where(Payment.status == status_filter)
    if date_from:
        query = query.where(Payment.created_at >= datetime.combine(date_from, datetime.min.time()))
        count_query = count_query.where(Payment.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(Payment.created_at <= datetime.combine(date_to, datetime.max.time()))
        count_query = count_query.where(Payment.created_at <= datetime.combine(date_to, datetime.max.time()))
    if order_id:
        query = query.where(Payment.order_id == order_id)
        count_query = count_query.where(Payment.order_id == order_id)
    if client_id and current_user.role == UserRole.admin:
        query = query.join(ServiceOrder, Payment.order_id == ServiceOrder.id).where(ServiceOrder.client_id == client_id)
        count_query = count_query.join(ServiceOrder, Payment.order_id == ServiceOrder.id).where(ServiceOrder.client_id == client_id)

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)

    result = await db.execute(
        query.options(selectinload(Payment.order))
        .order_by(Payment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    payments = result.scalars().all()

    items = []
    for p in payments:
        items.append(PaymentResponse(
            id=p.id,
            order_id=p.order_id,
            amount=p.amount,
            method=p.method,
            status=p.status,
            due_date=p.due_date,
            paid_at=p.paid_at,
            notes=p.notes,
            created_at=p.created_at,
            updated_at=p.updated_at,
            order_number=p.order.order_number if p.order else None,
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: uuid.UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment).options(selectinload(Payment.order)).where(Payment.id == payment_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")
    return PaymentResponse(
        id=p.id,
        order_id=p.order_id,
        amount=p.amount,
        method=p.method,
        status=p.status,
        due_date=p.due_date,
        paid_at=p.paid_at,
        notes=p.notes,
        created_at=p.created_at,
        updated_at=p.updated_at,
        order_number=p.order.order_number if p.order else None,
    )


@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: PaymentCreate,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    order = await db.execute(select(ServiceOrder).where(ServiceOrder.id == payload.order_id))
    if not order.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")

    payment = Payment(**payload.model_dump())
    db.add(payment)
    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="create",
        entity="payment",
        entity_id=payment.id,
        details={"amount": str(payload.amount), "method": payload.method.value},
        ip_address=request.client.host if request.client else None,
    ))
    return await get_payment(payment.id, current_user, db)


@router.put("/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: uuid.UUID,
    payload: PaymentUpdate,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(payment, key, value)

    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="update",
        entity="payment",
        entity_id=payment.id,
        details=update_data,
        ip_address=request.client.host if request.client else None,
    ))
    return await get_payment(payment.id, current_user, db)


@router.get("/expenses", response_model=PaginatedResponse[ExpenseResponse])
async def list_expenses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[ExpenseCategory] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Expense)
    count_query = select(func.count(Expense.id))

    if category:
        query = query.where(Expense.category == category)
        count_query = count_query.where(Expense.category == category)
    if date_from:
        query = query.where(Expense.date >= date_from)
        count_query = count_query.where(Expense.date >= date_from)
    if date_to:
        query = query.where(Expense.date <= date_to)
        count_query = count_query.where(Expense.date <= date_to)

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)

    result = await db.execute(
        query.options(selectinload(Expense.created_by_user))
        .order_by(Expense.date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    expenses = result.scalars().all()

    items = []
    for e in expenses:
        items.append(ExpenseResponse(
            id=e.id,
            category=e.category,
            description=e.description,
            amount=e.amount,
            date=e.date,
            notes=e.notes,
            created_by=e.created_by,
            created_at=e.created_at,
            created_by_name=e.created_by_user.name if e.created_by_user else None,
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).options(selectinload(Expense.created_by_user)).where(Expense.id == expense_id)
    )
    e = result.scalar_one_or_none()
    if not e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Despesa não encontrada")
    return ExpenseResponse(
        id=e.id,
        category=e.category,
        description=e.description,
        amount=e.amount,
        date=e.date,
        notes=e.notes,
        created_by=e.created_by,
        created_at=e.created_at,
        created_by_name=e.created_by_user.name if e.created_by_user else None,
    )


@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    expense = Expense(**payload.model_dump(), created_by=current_user.id)
    db.add(expense)
    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="create",
        entity="expense",
        entity_id=expense.id,
        details={"description": payload.description, "amount": str(payload.amount)},
        ip_address=request.client.host if request.client else None,
    ))
    return await get_expense(expense.id, current_user, db)


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Despesa não encontrada")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(expense, key, value)

    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="update",
        entity="expense",
        entity_id=expense.id,
        details=update_data,
        ip_address=request.client.host if request.client else None,
    ))
    return await get_expense(expense.id, current_user, db)


@router.delete("/expenses/{expense_id}", response_model=MessageResponse)
async def delete_expense(
    expense_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Despesa não encontrada")

    await db.delete(expense)

    db.add(AuditLog(
        user_id=current_user.id,
        action="delete",
        entity="expense",
        entity_id=expense_id,
        ip_address=request.client.host if request.client else None,
    ))
    return MessageResponse(message="Despesa excluída com sucesso")


@router.get("/cash-flow", response_model=CashFlowResponse)
async def get_cash_flow(
    date_from: date = Query(...),
    date_to: date = Query(...),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    payments_result = await db.execute(
        select(
            func.date(Payment.paid_at).label("dt"),
            func.sum(Payment.amount).label("total"),
        )
        .where(
            Payment.status == PaymentStatus.paid,
            func.date(Payment.paid_at) >= date_from,
            func.date(Payment.paid_at) <= date_to,
        )
        .group_by(func.date(Payment.paid_at))
        .order_by(func.date(Payment.paid_at))
    )
    revenue_by_day = {row.dt: Decimal(str(row.total)) for row in payments_result.all()}

    expenses_result = await db.execute(
        select(
            Expense.date,
            func.sum(Expense.amount).label("total"),
        )
        .where(
            Expense.date >= date_from,
            Expense.date <= date_to,
        )
        .group_by(Expense.date)
        .order_by(Expense.date)
    )
    expenses_by_day = {row.date: Decimal(str(row.total)) for row in expenses_result.all()}

    all_dates = sorted(set(list(revenue_by_day.keys()) + list(expenses_by_day.keys())))
    items = []
    total_revenue = Decimal("0.00")
    total_expenses = Decimal("0.00")

    for dt in all_dates:
        rev = revenue_by_day.get(dt, Decimal("0.00"))
        exp = expenses_by_day.get(dt, Decimal("0.00"))
        total_revenue += rev
        total_expenses += exp
        items.append(CashFlowItem(
            date=dt if isinstance(dt, date) else dt,
            revenue=rev,
            expenses=exp,
            balance=rev - exp,
        ))

    return CashFlowResponse(
        items=items,
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        total_balance=total_revenue - total_expenses,
    )


@router.get("/dashboard", response_model=FinancialDashboardResponse)
async def financial_dashboard(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    receivable = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.status.in_([PaymentStatus.pending, PaymentStatus.overdue]))
    )
    total_receivable = Decimal(str(receivable.scalar()))

    received = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.status == PaymentStatus.paid)
    )
    total_received = Decimal(str(received.scalar()))

    expenses = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
    )
    total_expenses = Decimal(str(expenses.scalar()))

    pending_count = await db.execute(
        select(func.count(Payment.id))
        .where(Payment.status.in_([PaymentStatus.pending, PaymentStatus.overdue]))
    )
    pending_payments = pending_count.scalar() or 0

    revenue_vs_expenses = total_received - total_expenses

    return FinancialDashboardResponse(
        total_receivable=total_receivable,
        total_received=total_received,
        total_expenses=total_expenses,
        pending_payments=pending_payments,
        revenue_vs_expenses=revenue_vs_expenses,
    )
