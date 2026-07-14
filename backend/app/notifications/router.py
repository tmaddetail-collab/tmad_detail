import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.notification import Notification, NotificationStatus
from app.models.audit import AuditLog
from app.auth.deps import get_current_user
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.notification import (
    NotificationSendRequest,
    NotificationResponse,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: Optional[bool] = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    count_query = select(func.count(Notification.id)).where(Notification.user_id == current_user.id)

    if unread_only:
        query = query.where(Notification.status == NotificationStatus.pending)
        count_query = count_query.where(Notification.status == NotificationStatus.pending)

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)

    result = await db.execute(
        query.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = result.scalars().all()

    return PaginatedResponse(
        items=[NotificationResponse(
            id=n.id,
            user_id=n.user_id,
            type=n.type,
            channel=n.channel,
            status=n.status,
            title=n.title,
            message=n.message,
            sent_at=n.sent_at,
            created_at=n.created_at,
            read=n.status == NotificationStatus.sent,
        ) for n in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.patch("/{notification_id}/read", response_model=MessageResponse)
async def mark_as_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada")

    notification.status = NotificationStatus.sent
    return MessageResponse(message="Notificação marcada como lida")


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    payload: NotificationSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem enviar notificações")

    user = await db.execute(select(User).where(User.id == payload.user_id))
    if not user.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    notification = Notification(
        user_id=payload.user_id,
        type=payload.type,
        channel=payload.channel,
        title=payload.title,
        message=payload.message,
        status=NotificationStatus.pending,
    )
    db.add(notification)
    await db.flush()

    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        type=notification.type,
        channel=notification.channel,
        status=notification.status,
        title=notification.title,
        message=notification.message,
        sent_at=notification.sent_at,
        created_at=notification.created_at,
        read=False,
    )
