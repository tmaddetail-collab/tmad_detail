import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AppLayout } from '@/components/Layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { LandingPage } from '@/pages/LandingPage'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useThemeStore } from '@/store/themeStore'
import { UserRole } from '@/types'
import { useEffect } from 'react'

// Client pages
import { ClientDashboard } from '@/pages/client/Dashboard'
import { ClientAppointments } from '@/pages/client/Appointments'
import { ClientOrders } from '@/pages/client/Orders'
import { ClientVehicles } from '@/pages/client/Vehicles'

// Admin pages
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { Agenda as AdminAgenda } from '@/pages/admin/Agenda'
import { Clients as AdminClients } from '@/pages/admin/Clients'
import { Services as AdminServices } from '@/pages/admin/Services'
import { Orders as AdminOrders } from '@/pages/admin/Orders'
import { Financial as AdminFinancial } from '@/pages/admin/Financial'
import { Reports as AdminReports } from '@/pages/admin/Reports'
import { Settings as AdminSettings } from '@/pages/admin/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/app" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== UserRole.ADMIN) return <Navigate to="/app" replace />
  return <>{children}</>
}

function AppContent() {
  const { isDark } = useThemeStore()

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardRouter />} />
          <Route path="appointments" element={<AppointmentsRouter />} />
          <Route path="orders" element={<OrdersRouter />} />
          <Route path="vehicles" element={<VehiclesRouter />} />
          <Route
            path="clients"
            element={
              <AdminRoute>
                <AdminClients />
              </AdminRoute>
            }
          />
          <Route
            path="services"
            element={
              <AdminRoute>
                <AdminServices />
              </AdminRoute>
            }
          />
          <Route
            path="agenda"
            element={
              <AdminRoute>
                <AdminAgenda />
              </AdminRoute>
            }
          />
          <Route
            path="financial"
            element={
              <AdminRoute>
                <AdminFinancial />
              </AdminRoute>
            }
          />
          <Route
            path="reports"
            element={
              <AdminRoute>
                <AdminReports />
              </AdminRoute>
            }
          />
          <Route
            path="settings"
            element={
              <AdminRoute>
                <AdminSettings />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}

function DashboardRouter() {
  const { user } = useAuth()
  if (user?.role === UserRole.ADMIN) return <AdminDashboard />
  return <ClientDashboard />
}

function AppointmentsRouter() {
  const { user } = useAuth()
  if (user?.role === UserRole.ADMIN) return <AdminAgenda />
  return <ClientAppointments />
}

function OrdersRouter() {
  const { user } = useAuth()
  if (user?.role === UserRole.ADMIN) return <AdminOrders />
  return <ClientOrders />
}

function VehiclesRouter() {
  const { user } = useAuth()
  if (user?.role === UserRole.ADMIN) return <AdminClients />
  return <ClientVehicles />
}

function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
