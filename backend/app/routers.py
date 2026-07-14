from app.auth.router import router as auth_router
from app.users.router import router as users_router
from app.vehicles.router import router as vehicles_router
from app.services.router import router as services_router
from app.appointments.router import router as appointments_router
from app.orders.router import router as orders_router
from app.checklists.router import router as checklists_router
from app.financial.router import router as financial_router
from app.notifications.router import router as notifications_router
from app.reports.router import router as reports_router
from app.dashboard.router import router as dashboard_router
from app.audit.router import router as audit_router

routers = [
    auth_router,
    users_router,
    vehicles_router,
    services_router,
    appointments_router,
    orders_router,
    checklists_router,
    financial_router,
    notifications_router,
    reports_router,
    dashboard_router,
    audit_router,
]
