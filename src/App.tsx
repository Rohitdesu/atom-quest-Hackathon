import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import DashboardLayout from "./components/layout/DashboardLayout"
import Login from "./pages/Login"
import EmployeeDashboard from "./pages/EmployeeDashboard"
import Goals from "./pages/Goals"
import ManagerDashboard from "./pages/ManagerDashboard"
import AdminDashboard from "./pages/AdminDashboard"
import Checkins from "./pages/Checkins"
import Reports from "./pages/Reports"
import SharedGoals from "./pages/SharedGoals"
import Analytics from "./pages/Analytics"
import Settings from "./pages/Settings"
import { AuthProvider } from "./contexts/AuthContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import { ProtectedRoute, RoleRoute } from "./components/auth/ProtectedRoute"
import { ErrorBoundary } from "./components/ui/ErrorBoundary"

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' },
          duration: 4000,
        }}
      />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Protected Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Navigate to="/employee-dashboard" replace />} />

                {/* Role-specific dashboards */}
                <Route element={<RoleRoute allowedRoles={['employee', 'manager', 'admin']} />}>
                  <Route path="/employee-dashboard" element={<ErrorBoundary><EmployeeDashboard /></ErrorBoundary>} />
                </Route>
                <Route element={<RoleRoute allowedRoles={['manager', 'admin']} />}>
                  <Route path="/manager-dashboard" element={<ErrorBoundary><ManagerDashboard /></ErrorBoundary>} />
                </Route>
                <Route element={<RoleRoute allowedRoles={['admin']} />}>
                  <Route path="/admin-dashboard" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
                </Route>

                {/* Shared Routes */}
                <Route path="/goals"    element={<ErrorBoundary><Goals /></ErrorBoundary>} />
                <Route path="/check-ins" element={<ErrorBoundary><Checkins /></ErrorBoundary>} />
                <Route path="/reports"  element={<ErrorBoundary><Reports /></ErrorBoundary>} />
                <Route path="/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                <Route path="/shared-goals" element={<ErrorBoundary><SharedGoals /></ErrorBoundary>} />
                <Route path="/settings"  element={<ErrorBoundary><Settings /></ErrorBoundary>} />
              </Route>
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}
