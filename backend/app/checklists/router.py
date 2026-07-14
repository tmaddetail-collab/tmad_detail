import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.order import ServiceOrder
from app.models.checklist import ChecklistItem
from app.models.audit import AuditLog
from app.auth.deps import get_current_user
from app.schemas.checklist import (
    ChecklistItemCreate,
    ChecklistItemUpdate,
    ChecklistItemResponse,
    ChecklistGroupedResponse,
    ChecklistResponse,
)

router = APIRouter(prefix="/checklists", tags=["Checklists"])


@router.get("/{order_id}", response_model=ChecklistResponse)
async def get_checklist(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    order = order.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")
    if current_user.role != UserRole.admin and order.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    items_result = await db.execute(
        select(ChecklistItem)
        .where(ChecklistItem.order_id == order_id)
        .order_by(ChecklistItem.section, ChecklistItem.item)
    )
    items = items_result.scalars().all()

    sections_map: dict[str, list[ChecklistItemResponse]] = {}
    for item in items:
        sections_map.setdefault(item.section, []).append(ChecklistItemResponse.model_validate(item))

    sections = [
        ChecklistGroupedResponse(section=section, items=item_list)
        for section, item_list in sections_map.items()
    ]

    return ChecklistResponse(order_id=order_id, sections=sections)


@router.put("/{order_id}/items/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: ChecklistItemUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem alterar checklist")

    result = await db.execute(
        select(ChecklistItem).where(
            ChecklistItem.id == item_id,
            ChecklistItem.order_id == order_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item do checklist não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    await db.flush()
    await db.refresh(item)

    db.add(AuditLog(
        user_id=current_user.id,
        action="update_checklist_item",
        entity="checklist_item",
        entity_id=item.id,
        details=update_data,
        ip_address=request.client.host if request.client else None,
    ))
    return item


@router.post("/{order_id}/items", response_model=ChecklistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_checklist_item(
    order_id: uuid.UUID,
    payload: ChecklistItemCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem adicionar itens")

    order = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    if not order.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ordem de serviço não encontrada")

    item = ChecklistItem(order_id=order_id, **payload.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)

    db.add(AuditLog(
        user_id=current_user.id,
        action="add_checklist_item",
        entity="checklist_item",
        entity_id=item.id,
        details={"section": item.section, "item": item.item},
        ip_address=request.client.host if request.client else None,
    ))
    return item
