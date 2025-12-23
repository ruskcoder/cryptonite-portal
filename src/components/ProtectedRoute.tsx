import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUserProfileStore } from '../store/userProfileStore'
import { type ReactNode } from 'react'

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth()
  const profile = useUserProfileStore((state) => state.profile)

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

