import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.order import ServiceOrder, OrderService, OrderStatus
from app.models.audit import AuditLog
from app.auth.deps import get_current_user
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse, VehicleSummary
from app.schemas.order import OrderSummary

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("", response_model=PaginatedResponse[VehicleSummary])
async def list_vehicles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    owner_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Vehicle)
    count_query = select(func.count(Vehicle.id))

    if current_user.role != UserRole.admin:
        query = query.where(Vehicle.owner_id == current_user.id)
        count_query = count_query.where(Vehicle.owner_id == current_user.id)
    elif owner_id:
        query = query.where(Vehicle.owner_id == owner_id)
        count_query = count_query.where(Vehicle.owner_id == owner_id)

    if search:
        search_filter = or_(
            Vehicle.plate.ilike(f"%{search}%"),
            Vehicle.brand.ilike(f"%{search}%"),
            Vehicle.model.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)

    result = await db.execute(
        query.order_by(Vehicle.brand, Vehicle.model).offset((page - 1) * page_size).limit(page_size)
    )
    items = result.scalars().all()
    return PaginatedResponse(
        items=[VehicleSummary.model_validate(v) for v in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    if current_user.role != UserRole.admin and vehicle.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return vehicle


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    payload: VehicleCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    owner_id = payload.owner_id if (payload.owner_id and current_user.role == UserRole.admin) else current_user.id

    existing = await db.execute(select(Vehicle).where(Vehicle.plate == payload.plate))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Placa já cadastrada")

    vehicle = Vehicle(
        owner_id=owner_id,
        brand=payload.brand,
        model=payload.model,
        year=payload.year,
        color=payload.color,
        plate=payload.plate,
        mileage=payload.mileage,
        notes=payload.notes,
    )
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)

    db.add(AuditLog(
        user_id=current_user.id,
        action="create",
        entity="vehicle",
        entity_id=vehicle.id,
        details={"plate": vehicle.plate, "model": f"{vehicle.brand} {vehicle.model}"},
        ip_address=request.client.host if request.client else None,
    ))
    return vehicle


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: uuid.UUID,
    payload: VehicleUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    if current_user.role != UserRole.admin and vehicle.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)

    await db.flush()
    await db.refresh(vehicle)

    db.add(AuditLog(
        user_id=current_user.id,
        action="update",
        entity="vehicle",
        entity_id=vehicle.id,
        details=update_data,
        ip_address=request.client.host if request.client else None,
    ))
    return vehicle


@router.delete("/{vehicle_id}", response_model=MessageResponse)
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    if current_user.role != UserRole.admin and vehicle.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    await db.delete(vehicle)

    db.add(AuditLog(
        user_id=current_user.id,
        action="delete",
        entity="vehicle",
        entity_id=vehicle_id,
        ip_address=request.client.host if request.client else None,
    ))
    return MessageResponse(message="Veículo excluído com sucesso")


@router.get("/{vehicle_id}/history", response_model=list[OrderSummary])
async def vehicle_history(
    vehicle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    if current_user.role != UserRole.admin and vehicle.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    orders_result = await db.execute(
        select(ServiceOrder)
        .where(ServiceOrder.vehicle_id == vehicle_id)
        .order_by(ServiceOrder.created_at.desc())
    )
    orders = orders_result.scalars().all()

    items = []
    for order in orders:
        client_result = await db.execute(select(User).where(User.id == order.client_id))
        client = client_result.scalar_one_or_none()
        items.append(OrderSummary(
            id=order.id,
            order_number=order.order_number,
            client_id=order.client_id,
            vehicle_id=order.vehicle_id,
            total_value=order.total_value,
            status=order.status,
            created_at=order.created_at,
            client_name=client.name if client else None,
            vehicle_info=f"{vehicle.brand} {vehicle.model} - {vehicle.plate}",
        ))
    return items
