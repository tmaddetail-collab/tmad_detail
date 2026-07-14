// ===== ENUMS =====

export enum UserRole {
  ADMIN = 'admin',
  CLIENT = 'client',
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export enum OrderStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PIX = 'pix',
  TRANSFER = 'transfer',
}

export enum ChecklistStatus {
  OK = 'ok',
  ATTENTION = 'attention',
  DAMAGED = 'damaged',
  NOT_CHECKED = 'not_checked',
}

export enum ServiceCategory {
  WASHING = 'lavagem',
  POLISHING = 'polimento',
  DETAILING = 'detalhamento',
  COATING = 'revestimento',
  INTERIOR = 'interior',
  ENGINE = 'motor',
  OTHER = 'outro',
}

export enum VehicleType {
  CAR = 'carro',
  MOTORCYCLE = 'moto',
  TRUCK = 'caminhao',
  SUV = 'suv',
  VAN = 'van',
}

export enum ExpenseCategory {
  SUPPLIES = 'insumos',
  EQUIPMENT = 'equipamentos',
  RENT = 'aluguel',
  SALARY = 'salario',
  UTILITIES = 'utilidades',
  MARKETING = 'marketing',
  MAINTENANCE = 'manutencao',
  OTHER = 'outro',
}

// ===== CORE ENTITIES =====

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  cpf?: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Vehicle {
  id: string
  plate: string
  brand: string
  model: string
  year: number
  color: string
  type: VehicleType
  mileage?: number
  notes?: string
  ownerId: string
  owner?: User
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  name: string
  description?: string
  category: ServiceCategory
  price: number
  estimatedMinutes: number
  isActive: boolean
  completed?: boolean
  createdAt: string
  updatedAt: string
}

export interface Appointment {
  id: string
  clientId: string
  client?: User
  vehicleId: string
  vehicle?: Vehicle
  services: Service[]
  scheduledAt: string
  estimatedEndAt?: string
  status: AppointmentStatus
  notes?: string
  totalValue: number
  createdAt: string
  updatedAt: string
}

export interface ChecklistItem {
  id: string
  orderId: string
  section: string
  item: string
  status: ChecklistStatus
  notes?: string
  photoUrl?: string
  checkedAt?: string
}

export interface OrderService {
  id: string
  serviceId: string
  service?: Service
  price: number
  notes?: string
  orderVehicleId?: string
  vehicleInfo?: string
}

export interface OrderVehicleType {
  id: string
  vehicleId: string
  vehicle?: Vehicle
  notes?: string
}

export interface ServiceOrder {
  id: string
  orderNumber: string
  clientId: string
  client?: User
  vehicleId: string
  vehicle?: Vehicle
  appointmentId?: string
  appointmentScheduledAt?: string
  appointment?: Appointment
  vehicles: OrderVehicleType[]
  services: OrderService[]
  status: OrderStatus
  totalValue: number
  checklist?: ChecklistItem[]
  photos?: OrderPhoto[]
  payment?: Payment
  clientSignature?: string
  clientObservations?: string
  signedAt?: string
  notes?: string
  startedAt?: string
  finishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface OrderPhoto {
  id: string
  orderId: string
  url: string
  type: 'before' | 'after' | 'during'
  caption?: string
  createdAt: string
}

export interface Payment {
  id: string
  orderId: string
  orderNumber?: string
  clientId: string
  client?: User
  amount: number
  method?: PaymentMethod
  status: PaymentStatus
  dueDate?: string
  paidAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  date: string
  notes?: string
  createdBy?: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  userId: string
  user?: User
  action: string
  entity: string
  entityId: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  link?: string
  createdAt: string
}

// ===== DASHBOARD TYPES =====

export interface DashboardKPIs {
  appointmentsToday: number
  inProgress: number
  finishedToday: number
  dailyRevenue: number
  monthlyRevenue: number
  totalClients: number
  totalVehicles: number
}

export interface RevenueDataPoint {
  month: string
  revenue: number
  expenses: number
  profit: number
}

export interface AppointmentsByStatus {
  status: AppointmentStatus
  count: number
  label: string
}

export interface TopService {
  service_name: string
  total_quantity: number
  total_revenue: number
  service_id?: string
}

// ===== API RESPONSE TYPES =====

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ApiError {
  message: string
  code?: string
  details?: Record<string, string[]>
}

export interface LoginResponse {
  user: User
  access_token: string
  refresh_token: string
  token_type?: string
  token?: string
}

export interface UploadResponse {
  url: string
  key: string
  filename: string
}

// ===== FORM TYPES =====

export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  name: string
  email: string
  phone?: string
  password: string
  confirmPassword: string
}

export interface VehicleForm {
  plate: string
  brand: string
  model: string
  year: number
  color: string
  type: VehicleType
  mileage?: number
  notes?: string
  ownerId: string
}

export interface AppointmentForm {
  clientId: string
  vehicleId: string
  serviceIds: string[]
  scheduledAt: string
  notes?: string
}

export interface ServiceForm {
  name: string
  description?: string
  category: ServiceCategory
  price: number
  estimatedMinutes: number
}

export interface ClientForm {
  name: string
  email: string
  phone?: string
  cpf?: string
  password?: string
}

export interface ExpenseForm {
  description: string
  amount: number
  category: ExpenseCategory
  date: string
  notes?: string
}

export interface ChecklistItemUpdate {
  status: ChecklistStatus
  notes?: string
  photoUrl?: string
}

// ===== FILTER TYPES =====

export interface AppointmentFilters {
  clientId?: string
  vehicleId?: string
  status?: AppointmentStatus
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface OrderFilters {
  clientId?: string
  status?: OrderStatus
  startDate?: string
  endDate?: string
  appointmentId?: string
  page?: number
  pageSize?: number
}

export interface FinancialFilters {
  startDate?: string
  endDate?: string
  period?: 'day' | 'week' | 'month' | 'year'
}

// ===== CALENDAR TYPES =====

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: AppointmentStatus
  client: string
  vehicle: string
  resource?: Appointment
}
