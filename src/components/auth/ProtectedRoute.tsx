import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type UserRole } from '@/contexts/AuthContext'
import { Target } from 'lucide-react'

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Target className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading session...</p>
      </div>
    )
  }

  if (!session) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export function RoleRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { profile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Target className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Verifying access...</p>
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(profile.role)) {
    // If user role is not allowed, redirect to their default dashboard based on their role
    return <Navigate to={`/${profile.role}-dashboard`} replace />
  }

  return <Outlet />
}
