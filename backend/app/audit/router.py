import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.auth.deps import get_current_admin
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/audit", tags=["Audit"])


class AuditLogResponseItem:
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime
    user_name: Optional[str] = None


@router.get("/logs", response_model=PaginatedResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    user_id: Optional[uuid.UUID] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))

    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)
    if entity:
        query = query.where(AuditLog.entity == entity)
        count_query = count_query.where(AuditLog.entity == entity)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
        count_query = count_query.where(AuditLog.user_id == user_id)
    if date_from:
        query = query.where(AuditLog.created_at >= date_from)
        count_query = count_query.where(AuditLog.created_at >= date_from)
    if date_to:
        query = query.where(AuditLog.created_at <= date_to)
        count_query = count_query.where(AuditLog.created_at <= date_to)

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)

    result = await db.execute(
        query.options(selectinload(AuditLog.user))
        .order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    logs = result.scalars().all()

    items = []
    for log in logs:
        items.append({
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "action": log.action,
            "entity": log.entity,
            "entity_id": str(log.entity_id) if log.entity_id else None,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat(),
            "user_name": log.user.name if log.user else None,
        })

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )
