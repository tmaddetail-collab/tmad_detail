import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.auth.deps import get_current_admin, get_current_user
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserAdminUpdate,
    UserResponse,
    UserSummary,
)
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse[UserSummary])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    count_query = select(func.count(User.id))

    if search:
        search_filter = or_(
            User.name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            User.cpf.ilike(f"%{search}%"),
            User.phone.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + page_size - 1) // page_size)

    result = await db.execute(
        query.order_by(User.name).offset((page - 1) * page_size).limit(page_size)
    )
    items = result.scalars().all()

    return PaginatedResponse(
        items=[UserSummary.model_validate(u) for u in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        cpf=payload.cpf,
        phone=payload.phone,
        role=UserRole.client,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    db.add(AuditLog(
        user_id=current_user.id,
        action="create",
        entity="user",
        entity_id=user.id,
        details={"name": user.name, "email": user.email},
        ip_address=request.client.host if request.client else None,
    ))
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    payload: UserAdminUpdate,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    await db.flush()
    await db.refresh(user)

    db.add(AuditLog(
        user_id=current_user.id,
        action="update",
        entity="user",
        entity_id=user.id,
        details=update_data,
        ip_address=request.client.host if request.client else None,
    ))
    return user


@router.patch("/{user_id}/toggle-active", response_model=UserResponse)
async def toggle_active(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Você não pode alterar seu próprio status")

    user.is_active = not user.is_active

    db.add(AuditLog(
        user_id=current_user.id,
        action="toggle_active",
        entity="user",
        entity_id=user.id,
        details={"is_active": user.is_active},
        ip_address=request.client.host if request.client else None,
    ))
    return user


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Você não pode excluir a si mesmo")

    await db.delete(user)

    db.add(AuditLog(
        user_id=current_user.id,
        action="delete",
        entity="user",
        entity_id=user_id,
        ip_address=request.client.host if request.client else None,
    ))
    return MessageResponse(message="Usuário excluído com sucesso")
