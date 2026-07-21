import os
from contextlib import asynccontextmanager
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.database import engine, Base
from app.routers import routers


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        # Add order_vehicle_id column to order_services if not exists
        result = await conn.execute(
            text("PRAGMA table_info(order_services)")
        )
        cols = {row[1] for row in result.fetchall()}
        if "order_vehicle_id" not in cols:
            await conn.execute(
                text("ALTER TABLE order_services ADD COLUMN order_vehicle_id UUID REFERENCES order_vehicles(id) ON DELETE CASCADE")
            )
        # Recreate order_services table with composite PK (order_id, service_id, order_vehicle_id)
        result = await conn.execute(
            text("PRAGMA table_info(order_services)")
        )
        pk_cols = {row[1] for row in result.fetchall() if row[5] == 1}  # pk=1
        if pk_cols != {"order_id", "service_id", "order_vehicle_id"}:
            await conn.execute(text("""
                CREATE TABLE order_services_new (
                    order_id CHAR(32) NOT NULL,
                    service_id CHAR(32) NOT NULL,
                    order_vehicle_id CHAR(32),
                    price_at_time NUMERIC(10,2) NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    PRIMARY KEY (order_id, service_id, order_vehicle_id),
                    FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
                    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
                    FOREIGN KEY (order_vehicle_id) REFERENCES order_vehicles(id) ON DELETE CASCADE
                )
            """))
            await conn.execute(text("""
                INSERT INTO order_services_new SELECT order_id, service_id, order_vehicle_id, price_at_time, quantity FROM order_services
            """))
            await conn.execute(text("DROP TABLE order_services"))
            await conn.execute(text("ALTER TABLE order_services_new RENAME TO order_services"))
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    from app.seed import seed
    await seed()

    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_path = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

for router in routers:
    app.include_router(router, prefix="/api/v1")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    detail = {"message": "Erro de validação", "errors": exc.errors()}
    if settings.DEBUG:
        detail["body"] = exc.body
    return JSONResponse(status_code=422, content=detail)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    try:
        detail = str(exc) if settings.DEBUG else "Erro interno do servidor"
    except Exception:
        detail = traceback.format_exception_only(type(exc), exc)[-1].strip()
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
    )


@app.get("/")
async def root():
    return {"message": f"{settings.APP_NAME} API", "version": settings.APP_VERSION}


@app.get("/health")
async def health():
    return {"status": "ok"}
