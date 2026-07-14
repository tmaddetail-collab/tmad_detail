# Models package - import all models to ensure they are registered with SQLAlchemy Base
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.service import Service
from app.models.appointment import Appointment, AppointmentService, AppointmentStatus
from app.models.order import ServiceOrder, OrderService, OrderPhoto, OrderVehicle, OrderStatus, PhotoType
from app.models.checklist import ChecklistItem, ChecklistStatus
from app.models.financial import Payment, Expense, PaymentMethod, PaymentStatus, ExpenseCategory
from app.models.notification import Notification, NotificationType, NotificationChannel, NotificationStatus
from app.models.audit import AuditLog

__all__ = [
    "User",
    "UserRole",
    "Vehicle",
    "Service",
    "Appointment",
    "AppointmentService",
    "AppointmentStatus",
    "ServiceOrder",
    "OrderService",
    "OrderPhoto",
    "OrderVehicle",
    "OrderStatus",
    "PhotoType",
    "ChecklistItem",
    "ChecklistStatus",
    "Payment",
    "Expense",
    "PaymentMethod",
    "PaymentStatus",
    "ExpenseCategory",
    "Notification",
    "NotificationType",
    "NotificationChannel",
    "NotificationStatus",
    "AuditLog",
]
