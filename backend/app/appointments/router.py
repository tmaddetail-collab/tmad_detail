import uuid
from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.service import Service
from app.models.appointment import Appointment, AppointmentService, AppointmentStatus
from app.models.audit import AuditLog
from app.auth.deps import get_current_user, get_current_admin
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentStatusUpdate,
    AppointmentServiceStatusUpdate,
    AppointmentResponse,
    AppointmentServiceResponse,
    AppointmentSummary,
    AvailableSlot,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("", response_model=PaginatedResponse[AppointmentSummary])
async def list_appointments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[AppointmentStatus] = Query(None, alias="status"),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    client_id: Optional[uuid.UUID] = Query(None),
    vehicle_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Appointment)
    count_query = select(func.count(Appointment.id))

    if current_user.role != UserRole.admin:
        query = query.where(Appointment.client_id == current_user.id)
        count_query = count_query.where(Appointment.client_id == current_user.id)
    else:
        if client_id:
            query = query.where(Appointment.client_id == client_id)
            count_query = count_query.where(Appointment.client_id == client_id)

    if status_filter:
        query = query.where(Appointment.status == status_filter)
        count_query = count_query.where(Appointment.status == status_filter)
    if date_from:
        query = query.where(Appointment.scheduled_at >= datetime.combine(date_from, time.min))
        count_query = count_query.where(Appointment.scheduled_at >= datetime.combine(date_from, time.min))
    if date_to:
        query = query.where(Appointment.scheduled_at <= datetime.combine(date_to, time.max))
        count_query = count_query.where(Appointment.scheduled_at <= datetime.combine(date_to, time.max))
    if vehicle_id:
        query = query.where(Appointment.vehicle_id == vehicle_id)
        count_query = count_query.where(Appointment.vehicle_id == vehicle_id)

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)

    result = await db.execute(
        query.options(selectinload(Appointment.client), selectinload(Appointment.vehicle))
        .order_by(Appointment.scheduled_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    appointments = result.scalars().all()

    items = []
    for apt in appointments:
        items.append(AppointmentSummary(
            id=apt.id,
            client_id=apt.client_id,
            vehicle_id=apt.vehicle_id,
            scheduled_at=apt.scheduled_at,
            status=apt.status,
            client_name=apt.client.name if apt.client else None,
            vehicle_info=f"{apt.vehicle.brand} {apt.vehicle.model} - {apt.vehicle.plate}" if apt.vehicle else None,
        ))

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/available-slots", response_model=list[AvailableSlot])
async def get_available_slots(
    target_date: date = Query(...),
    duration_minutes: int = Query(60),
    db: AsyncSession = Depends(get_db),
):
    day_start = datetime.combine(target_date, time(8, 0))
    day_end = datetime.combine(target_date, time(18, 0))
    slot_duration = timedelta(minutes=duration_minutes)

    existing = await db.execute(
        select(Appointment)
        .where(
            and_(
                Appointment.scheduled_at >= day_start,
                Appointment.scheduled_at < day_end,
                Appointment.status != AppointmentStatus.cancelled,
            )
        )
        .order_by(Appointment.scheduled_at)
    )
    booked = existing.scalars().all()

    slots = []
    current = day_start
    while current + slot_duration <= day_end:
        conflict = False
        for apt in booked:
            apt_end = apt.scheduled_at + timedelta(minutes=apt.duration_minutes)
            slot_end = current + slot_duration
            if current < apt_end and slot_end > apt.scheduled_at:
                conflict = True
                break
        if not conflict:
            slots.append(AvailableSlot(start=current, end=current + slot_duration))
        current += timedelta(minutes=30)

    return slots


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.client),
            selectinload(Appointment.vehicle),
            selectinload(Appointment.appointment_services).selectinload(AppointmentService.service),
        )
        .where(Appointment.id == appointment_id)
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado")
    if current_user.role != UserRole.admin and apt.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    services = []
    for asrv in apt.appointment_services:
        services.append(AppointmentServiceResponse(
            service_id=asrv.service_id,
            price_at_time=asrv.price_at_time,
            completed=asrv.completed,
            service_name=asrv.service.name if asrv.service else None,
        ))

    return AppointmentResponse(
        id=apt.id,
        client_id=apt.client_id,
        vehicle_id=apt.vehicle_id,
        scheduled_at=apt.scheduled_at,
        duration_minutes=apt.duration_minutes,
        status=apt.status,
        notes=apt.notes,
        created_by=apt.created_by,
        created_at=apt.created_at,
        updated_at=apt.updated_at,
        client_name=apt.client.name if apt.client else None,
        vehicle_info=f"{apt.vehicle.brand} {apt.vehicle.model} - {apt.vehicle.plate}" if apt.vehicle else None,
        services=services,
    )


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client_id = payload.client_id if (current_user.role == UserRole.admin) else current_user.id

    vehicle = await db.execute(select(Vehicle).where(Vehicle.id == payload.vehicle_id))
    vehicle = vehicle.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Veículo não encontrado")
    if current_user.role != UserRole.admin and vehicle.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Veículo não pertence ao usuário")

    if payload.services:
        for srv in payload.services:
            svc = await db.execute(select(Service).where(Service.id == srv.service_id))
            if not svc.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Serviço {srv.service_id} não encontrado")

    apt = Appointment(
        client_id=client_id,
        vehicle_id=payload.vehicle_id,
        scheduled_at=payload.scheduled_at,
        duration_minutes=payload.duration_minutes,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(apt)
    await db.flush()

    for srv in payload.services:
        db.add(AppointmentService(
            appointment_id=apt.id,
            service_id=srv.service_id,
            price_at_time=srv.price_at_time,
        ))

    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="create",
        entity="appointment",
        entity_id=apt.id,
        details={"scheduled_at": str(apt.scheduled_at), "client_id": str(client_id)},
        ip_address=request.client.host if request.client else None,
    ))
    return await get_appointment(apt.id, current_user, db)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.appointment_services))
        .where(Appointment.id == appointment_id)
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado")
    if current_user.role != UserRole.admin and apt.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    update_data = payload.model_dump(exclude_unset=True)
    services_data = update_data.pop("services", None)

    for key, value in update_data.items():
        setattr(apt, key, value)

    if services_data is not None:
        for old_srv in apt.appointment_services:
            await db.delete(old_srv)
        for srv in services_data:
            db.add(AppointmentService(
                appointment_id=apt.id,
                service_id=srv.service_id,
                price_at_time=srv.price_at_time,
            ))

    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="update",
        entity="appointment",
        entity_id=apt.id,
        details=update_data,
        ip_address=request.client.host if request.client else None,
    ))
    return await get_appointment(apt.id, current_user, db)


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
async def update_appointment_status(
    appointment_id: uuid.UUID,
    payload: AppointmentStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado")
    if current_user.role != UserRole.admin and apt.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    apt.status = payload.status
    await db.flush()

    db.add(AuditLog(
        user_id=current_user.id,
        action="change_status",
        entity="appointment",
        entity_id=apt.id,
        details={"status": payload.status.value},
        ip_address=request.client.host if request.client else None,
    ))
    return await get_appointment(apt.id, current_user, db)


@router.patch("/{appointment_id}/services/{service_id}", response_model=AppointmentServiceResponse)
async def update_appointment_service(
    appointment_id: uuid.UUID,
    service_id: uuid.UUID,
    payload: AppointmentServiceStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem alterar serviços do agendamento")

    result = await db.execute(
        select(AppointmentService)
        .options(selectinload(AppointmentService.service))
        .where(
            AppointmentService.appointment_id == appointment_id,
            AppointmentService.service_id == service_id,
        )
    )
    asrv = result.scalar_one_or_none()
    if not asrv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado no agendamento")

    asrv.completed = payload.completed
    await db.flush()

    return AppointmentServiceResponse(
        service_id=asrv.service_id,
        price_at_time=asrv.price_at_time,
        completed=asrv.completed,
        service_name=asrv.service.name if asrv.service else None,
    )


@router.delete("/{appointment_id}", response_model=MessageResponse)
async def delete_appointment(
    appointment_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado")
    if current_user.role != UserRole.admin and apt.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    await db.delete(apt)

    db.add(AuditLog(
        user_id=current_user.id,
        action="delete",
        entity="appointment",
        entity_id=appointment_id,
        ip_address=request.client.host if request.client else None,
    ))
    return MessageResponse(message="Agendamento excluído com sucesso")
