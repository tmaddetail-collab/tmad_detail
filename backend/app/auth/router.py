import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.auth.deps import get_current_user
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    GoogleAuthUrlResponse,
)
from app.schemas.common import MessageResponse
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

    user = User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        cpf=payload.cpf,
        password_hash=hash_password(payload.password),
        role=UserRole.client,
    )
    db.add(user)
    await db.flush()

    db.add(AuditLog(
        user_id=user.id,
        action="register",
        entity="user",
        entity_id=user.id,
        ip_address=request.client.host if request.client else None,
    ))

    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id), user.role.value)
    user_resp = UserResponse.model_validate(user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user_resp)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou senha inválidos")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    db.add(AuditLog(
        user_id=user.id,
        action="login",
        entity="user",
        entity_id=user.id,
        ip_address=request.client.host if request.client else None,
    ))

    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id), user.role.value)
    user_resp = UserResponse.model_validate(user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user_resp)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.refresh_token)
    if token_data.exp is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    result = await db.execute(select(User).where(User.id == uuid.UUID(token_data.sub)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id), user.role.value)
    user_resp = UserResponse.model_validate(user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/google", response_model=GoogleAuthUrlResponse)
async def google_login():
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Google OAuth não configurado")
    redirect_uri = f"{settings.FRONTEND_URL}/api/v1/auth/google/callback"
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=email%20profile"
    )
    return GoogleAuthUrlResponse(url=url)


@router.get("/google/callback", response_model=TokenResponse)
async def google_callback(code: str, request: Request, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Google OAuth não configurado")

    import httpx
    token_url = "https://oauth2.googleapis.com/token"
    redirect_uri = f"{settings.FRONTEND_URL}/api/v1/auth/google/callback"
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(token_url, data=data)
        if token_resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha na autenticação com Google")
        tokens = token_resp.json()
        access_token_google = tokens["access_token"]

        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token_google}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Falha ao obter dados do Google")
        google_user = userinfo_resp.json()

    google_id = google_user["id"]
    email = google_user["email"]
    name = google_user.get("name", email.split("@")[0])
    avatar = google_user.get("picture")

    result = await db.execute(select(User).where((User.google_id == google_id) | (User.email == email)))
    user = result.scalar_one_or_none()

    if user:
        if not user.google_id:
            user.google_id = google_id
        if avatar and not user.avatar_url:
            user.avatar_url = avatar
    else:
        user = User(
            name=name,
            email=email,
            google_id=google_id,
            avatar_url=avatar,
            role=UserRole.client,
        )
        db.add(user)

    await db.flush()

    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id), user.role.value)
    user_resp = UserResponse.model_validate(user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, user=user_resp)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        return MessageResponse(message="Se o email existir, você receberá um link de recuperação")

    reset_token = create_access_token(
        str(user.id),
        user.role.value,
        expires_delta=timedelta(hours=1),
    )

    if settings.MAIL_USERNAME:
        from app.config import settings as s
        import smtplib
        from email.message import EmailMessage

        msg = EmailMessage()
        msg["Subject"] = "Recuperação de senha - DetailApp"
        msg["From"] = s.MAIL_FROM
        msg["To"] = user.email
        reset_link = f"{s.FRONTEND_URL}/reset-password?token={reset_token}"
        msg.set_content(f"Clique no link para redefinir sua senha: {reset_link}")

        try:
            with smtplib.SMTP(s.MAIL_SERVER, s.MAIL_PORT) as smtp:
                if s.MAIL_TLS:
                    smtp.starttls()
                if s.MAIL_USERNAME and s.MAIL_PASSWORD:
                    smtp.login(s.MAIL_USERNAME, s.MAIL_PASSWORD)
                smtp.send_message(msg)
        except Exception:
            pass

    return MessageResponse(message="Se o email existir, você receberá um link de recuperação")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.token)
    try:
        uid = uuid.UUID(token_data.sub)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido")

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    user.password_hash = hash_password(payload.password)
    return MessageResponse(message="Senha redefinida com sucesso")
