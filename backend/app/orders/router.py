import uuid
import os
import shutil
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, status
from sqlalchemy import select, func, and_, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.service import Service
from app.models.appointment import Appointment
from app.models.order import ServiceOrder, OrderService, OrderPhoto, OrderVehicle, OrderStatus, PhotoType
from app.models.checklist import ChecklistItem, ChecklistStatus
from app.models.audit import AuditLog
from app.auth.deps import get_current_user, get_current_admin
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.order import (
    OrderCreate,
    OrderUpdate,
    OrderStatusUpdate,
    OrderApprove,
    OrderResponse,
    OrderSummary,
    OrderVehicleResponse,
    OrderServiceResponse,
    OrderPhotoResponse,
)

CHECKLIST_TEMPLATES = {
    "externo": [
        "Pintura geral", "Para-choque dianteiro", "Para-choque traseiro",
        "Capô", "Teto", "Portas", "Retrovisores", "Vidros",
        "Faróis", "Lanternas", "Rodas", "Pneus",
    ],
    "interno": [
        "Banco motorista", "Banco passageiro", "Banco traseiro",
        "Painel", "Volante", "Central multimídia", "Tetos",
        "Laterais portas", "Tapetes", "Porta-malas",
    ],
    "geral": [
        "Cheiro interno", "Funcionamento ar condicionado",
        "Vedação borrachas", "Estado geral",
    ],
}

router = APIRouter(prefix="/orders", tags=["Orders"])


async def generate_order_number(db: AsyncSession) -> str:
    today = datetime.now(timezone.utc)
    prefix = f"OS{today.strftime('%y%m')}"
    result = await db.execute(
        select(func.count(ServiceOrder.id))
        .where(ServiceOrder.order_number.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


@router.get("", response_model=PaginatedResponse[OrderSummary])
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[OrderStatus] = Query(None, alias="status"),
    client_id: Optional[uuid.UUID] = Query(None),
    vehicle_id: Optional[uuid.UUID] = Query(None),
    appointment_id: Optional[uuid.UUID] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ServiceOrder)
    count_query = select(func.count(ServiceOrder.id))

    if current_user.role != UserRole.admin:
        query = query.where(ServiceOrder.client_id == current_user.id)
        count_query = count_query.where(ServiceOrder.client_id == current_user.id)
    else:
        if client_id:
            query = query.where(ServiceOrder.client_id == client_id)
            count_query = count_query.where(ServiceOrder.client_id == client_id)

    if status_filter:
        query = query.where(ServiceOrder.status == status_filter)
        count_query = count_query.where(ServiceOrder.status == status_filter)
    if vehicle_id:
        query = query.where(ServiceOrder.vehicle_id == vehicle_id)
        count_query = count_query.where(ServiceOrder.vehicle_id == vehicle_id)
    if appointment_id:
        query = query.where(ServiceOrder.appointment_id == appointment_id)
        count_query = count_query.where(ServiceOrder.appointment_id == appointment_id)
    if date_from:
        query = query.where(ServiceOrder.created_at >= date_from)
        count_query = count_query.where(ServiceOrder.created_at >= date_from)
    if date_to:
        query = query.where(ServiceOrder.created_at <= date_to)
        count_query = count_query.where(ServiceOrder.created_at <= date_to)

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)

    result = await db.execute(
        query.options(
            selectinload(ServiceOrder.client),
            selectinload(ServiceOrder.vehicle),
            selectinload(ServiceOrder.order_vehicles).selectinload(OrderVehicle.vehicle),
            selectinload(ServiceOrder.order_services).selectinload(OrderService.service),
            selectinload(ServiceOrder.appointment),
        )
        .order_by(ServiceOrder.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    orders = result.scalars().all()

    items = []
    for order in orders:
        pts = sum(
            float(
                os.price_at_time if os.price_at_time > 0 and os.service and os.service.price > 0
                else (os.service.price if os.service else os.price_at_time)
            ) * os.quantity
            for os in order.order_services
        )
        items.append(OrderSummary(
            id=order.id,
            order_number=order.order_number,
            client_id=order.client_id,
            vehicle_id=order.vehicle_id,
            total_value=pts,
            status=order.status,
            created_at=order.created_at,
            appointment_scheduled_at=order.appointment.scheduled_at if order.appointment else None,
            client_name=order.client.name if order.client else None,
            vehicle_info=f"{order.vehicle.brand} {order.vehicle.model} - {order.vehicle.plate}" if order.vehicle else None,
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ServiceOrder)
        .options(
            selectinload(ServiceOrder.client),
            selectinload(ServiceOrder.vehicle),
            selectinload(ServiceOrder.responsible),
            selectinload(ServiceOrder.order_vehicles).selectinload(OrderVehicle.vehicle),
            selectinload(ServiceOrder.order_services).selectinload(OrderService.service),
            selectinload(ServiceOrder.photos),
            selectinload(ServiceOrder.appointment),
        )
        .where(ServiceOrder.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")
    if current_user.role != UserRole.admin and order.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    services = []
    computed_total = 0
    for osrv in order.order_services:
        veh_info = None
        if osrv.order_vehicle_id and osrv.order_vehicle and osrv.order_vehicle.vehicle:
            v = osrv.order_vehicle.vehicle
            veh_info = f"{v.brand} {v.model} - {v.plate}"
        effective_price = osrv.price_at_time
        if effective_price <= 0 and osrv.service and osrv.service.price > 0:
            effective_price = osrv.service.price
        computed_total += float(effective_price) * osrv.quantity
        services.append(OrderServiceResponse(
            service_id=osrv.service_id,
            price_at_time=effective_price,
            quantity=osrv.quantity,
            service_name=osrv.service.name if osrv.service else None,
            order_vehicle_id=osrv.order_vehicle_id,
            vehicle_info=veh_info,
        ))

    vehicles = []
    for ov in order.order_vehicles:
        vehicles.append(OrderVehicleResponse(
            id=ov.id,
            vehicle_id=ov.vehicle_id,
            notes=ov.notes,
            vehicle_info=f"{ov.vehicle.brand} {ov.vehicle.model} - {ov.vehicle.plate}" if ov.vehicle else None,
        ))

    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        appointment_id=order.appointment_id,
        appointment_scheduled_at=order.appointment.scheduled_at if order.appointment else None,
        client_id=order.client_id,
        vehicle_id=order.vehicle_id,
        responsible_id=order.responsible_id,
        total_value=computed_total,
        status=order.status,
        notes=order.notes,
        client_signature=order.client_signature,
        client_approved_at=order.client_approved_at,
        client_observations=order.client_observations,
        created_at=order.created_at,
        updated_at=order.updated_at,
        client_name=order.client.name if order.client else None,
        vehicle_info=f"{order.vehicle.brand} {order.vehicle.model} - {order.vehicle.plate}" if order.vehicle else None,
        responsible_name=order.responsible.name if order.responsible else None,
        vehicles=vehicles,
        services=services,
        photos=[OrderPhotoResponse.model_validate(p) for p in order.photos],
    )


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem criar ordens")

    if not payload.vehicles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pelo menos um veículo é obrigatório")

    for v in payload.vehicles:
        veh = await db.execute(select(Vehicle).where(Vehicle.id == v.vehicle_id))
        if not veh.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Veículo {v.vehicle_id} não encontrado")

    total_value = 0
    for srv_data in payload.services:
        svc = await db.execute(select(Service).where(Service.id == srv_data.service_id))
        svc = svc.scalar_one_or_none()
        if not svc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Serviço {srv_data.service_id} não encontrado")
        total_value += float(srv_data.price_at_time) * srv_data.quantity

    order_number = await generate_order_number(db)
    order = ServiceOrder(
        order_number=order_number,
        appointment_id=payload.appointment_id,
        client_id=payload.client_id,
        vehicle_id=payload.vehicles[0].vehicle_id,
        responsible_id=payload.responsible_id,
        total_value=total_value,
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    for v in payload.vehicles:
        db.add(OrderVehicle(
            order_id=order.id,
            vehicle_id=v.vehicle_id,
            notes=v.notes,
        ))

    await db.flush()

    # Map service vehicle_idx to OrderVehicle id
    ov_list = []
    for idx, v in enumerate(payload.vehicles):
        ov = await db.execute(
            select(OrderVehicle).where(
                OrderVehicle.order_id == order.id,
                OrderVehicle.vehicle_id == v.vehicle_id,
            )
        )
        ov = ov.scalar_one_or_none()
        ov_list.append(ov.id if ov else None)

    for srv_data in payload.services:
        ov_id = srv_data.order_vehicle_id
        if ov_id is None and srv_data.vehicle_idx is not None:
            idx = srv_data.vehicle_idx
            if 0 <= idx < len(ov_list):
                ov_id = ov_list[idx]
        db.add(OrderService(
            order_id=order.id,
            service_id=srv_data.service_id,
            order_vehicle_id=ov_id,
            price_at_time=srv_data.price_at_time,
            quantity=srv_data.quantity,
        ))

    await db.flush()

    for section, items in CHECKLIST_TEMPLATES.items():
        for item_name in items:
            db.add(ChecklistItem(
                order_id=order.id,
                section=section,
                item=item_name,
                status=ChecklistStatus.not_checked,
            ))

    await db.flush()

    if payload.appointment_id:
        apt = await db.execute(select(Appointment).where(Appointment.id == payload.appointment_id))
        apt = apt.scalar_one_or_none()
        if apt:
            apt.status = "in_progress"

    db.add(AuditLog(
        user_id=current_user.id,
        action="create",
        entity="service_order",
        entity_id=order.id,
        details={"order_number": order_number, "total_value": str(total_value)},
        ip_address=request.client.host if request.client else None,
    ))
    return await get_order(order.id, current_user, db)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: uuid.UUID,
    payload: OrderUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem alterar ordens")

    result = await db.execute(
        select(ServiceOrder)
        .where(ServiceOrder.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")

    update_data = payload.model_dump(exclude_unset=True)
    services_data = update_data.pop("services", None)
    vehicles_data = update_data.pop("vehicles", None)

    for key, value in update_data.items():
        setattr(order, key, value)

    # Process vehicles FIRST so new IDs are available for service mapping
    if vehicles_data is not None:
        await db.execute(sa_delete(OrderVehicle).where(OrderVehicle.order_id == order.id))
        for v_data in vehicles_data:
            vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == v_data["vehicle_id"]))
            if not vehicle_result.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Veículo {v_data['vehicle_id']} não encontrado")
            db.add(OrderVehicle(
                order_id=order.id,
                vehicle_id=v_data["vehicle_id"],
                notes=v_data.get("notes"),
            ))
        if vehicles_data:
            order.vehicle_id = vehicles_data[0]["vehicle_id"]
        await db.flush()

    if services_data is not None:
        await db.execute(sa_delete(OrderService).where(OrderService.order_id == order.id))
        # Build vehicle index → id mapping for new OrderVehicles
        ov_idx_to_id = {}
        if vehicles_data is not None:
            ov_rows = await db.execute(
                select(OrderVehicle).where(OrderVehicle.order_id == order.id).order_by(OrderVehicle.id)
            )
            for i, ov in enumerate(ov_rows.scalars().all()):
                ov_idx_to_id[i] = ov.id

        total_value = 0
        for srv_data in services_data:
            ov_id = srv_data.get("order_vehicle_id")
            # Map vehicle_idx to actual OrderVehicle id
            vehicle_idx = srv_data.get("vehicle_idx")
            if vehicle_idx is not None and vehicle_idx in ov_idx_to_id:
                ov_id = ov_idx_to_id[vehicle_idx]
            db.add(OrderService(
                order_id=order.id,
                service_id=srv_data["service_id"],
                order_vehicle_id=ov_id,
                price_at_time=srv_data["price_at_time"],
                quantity=srv_data["quantity"],
            ))
            total_value += float(srv_data["price_at_time"]) * srv_data["quantity"]
        order.total_value = total_value

    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="update",
        entity="service_order",
        entity_id=order.id,
        details=update_data,
        ip_address=request.client.host if request.client else None,
    ))
    return await get_order(order.id, current_user, db)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem alterar status")

    order.status = payload.status
    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="change_status",
        entity="service_order",
        entity_id=order.id,
        details={"status": payload.status.value},
        ip_address=request.client.host if request.client else None,
    ))
    return await get_order(order.id, current_user, db)


@router.post("/{order_id}/approve", response_model=MessageResponse)
async def approve_order(
    order_id: uuid.UUID,
    payload: OrderApprove,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")
    if order.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não pode aprovar esta ordem")

    order.client_signature = payload.signature
    order.client_approved_at = datetime.now(timezone.utc)
    order.client_observations = payload.observations
    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="approve",
        entity="service_order",
        entity_id=order.id,
        ip_address=request.client.host if request.client else None,
    ))
    return MessageResponse(message="Ordem de serviço aprovada com sucesso")


@router.post("/{order_id}/photos", response_model=list[OrderPhotoResponse])
async def upload_photos(
    order_id: uuid.UUID,
    photo_type: PhotoType = Query(...),
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")

    order_upload_dir = os.path.join(settings.UPLOAD_DIR, "orders", str(order_id), photo_type.value)
    os.makedirs(order_upload_dir, exist_ok=True)

    responses = []
    for file in files:
        file_ext = os.path.splitext(file.filename or "photo.jpg")[1]
        filename = f"{uuid.uuid4()}{file_ext}"
        filepath = os.path.join(order_upload_dir, filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)

        url = f"/uploads/orders/{order_id}/{photo_type.value}/{filename}"
        photo = OrderPhoto(order_id=order_id, type=photo_type, url=url, filename=filename)
        db.add(photo)
        await db.flush()
        responses.append(OrderPhotoResponse.model_validate(photo))

    return responses


@router.delete("/{order_id}", response_model=MessageResponse)
async def delete_order(
    order_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")

    await db.delete(order)

    db.add(AuditLog(
        user_id=current_user.id,
        action="delete",
        entity="service_order",
        entity_id=order_id,
        ip_address=request.client.host if request.client else None,
    ))
    return MessageResponse(message="Ordem de serviço excluída com sucesso")
