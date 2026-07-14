import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.user import User, UserRole
from app.models.service import Service
from app.models.audit import AuditLog
from app.auth.deps import get_current_admin, get_current_user
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceResponse, ServiceSummary

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("", response_model=PaginatedResponse[ServiceSummary])
async def list_services(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Service)
    count_query = select(func.count(Service.id))

    if search:
        search_filter = or_(
            Service.name.ilike(f"%{search}%"),
            Service.description.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    if category:
        query = query.where(Service.category == category)
        count_query = count_query.where(Service.category == category)
    if is_active is not None:
        query = query.where(Service.is_active == is_active)
        count_query = count_query.where(Service.is_active == is_active)

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)

    result = await db.execute(
        query.order_by(Service.name).offset((page - 1) * page_size).limit(page_size)
    )
    items = result.scalars().all()
    return PaginatedResponse(
        items=[ServiceSummary.model_validate(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado")
    return service


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    payload: ServiceCreate,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Service).where(Service.name == payload.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Serviço já existe")

    service = Service(**payload.model_dump())
    db.add(service)
    await db.flush()
    await db.refresh(service)

    db.add(AuditLog(
        user_id=current_user.id,
        action="create",
        entity="service",
        entity_id=service.id,
        details={"name": service.name, "price": str(service.price)},
        ip_address=request.client.host if request.client else None,
    ))
    return service


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: uuid.UUID,
    payload: ServiceUpdate,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(service, key, value)

    await db.flush()
    await db.refresh(service)

    db.add(AuditLog(
        user_id=current_user.id,
        action="update",
        entity="service",
        entity_id=service.id,
        details=update_data,
        ip_address=request.client.host if request.client else None,
    ))
    return service


@router.delete("/{service_id}", response_model=MessageResponse)
async def delete_service(
    service_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado")

    # Check if linked to appointments or orders
    for tbl, label in [("appointment_services", "agendamentos"), ("order_services", "pedidos")]:
        r = await db.execute(text(f"SELECT COUNT(*) FROM {tbl} WHERE service_id = :sid"), {"sid": service_id.hex})
        if r.scalar() > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Serviço vinculado a {label}. Inative-o em vez de excluir.",
            )

    await db.delete(service)

    db.add(AuditLog(
        user_id=current_user.id,
        action="delete",
        entity="service",
        entity_id=service_id,
        ip_address=request.client.host if request.client else None,
    ))
    return MessageResponse(message="Serviço excluído com sucesso")
