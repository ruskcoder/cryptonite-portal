import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { Discord } from './pages/Discord'
import { Leaderboard } from './pages/Leaderboard'
import { UserDetails } from './pages/admin/UserDetails'
import { HoursLog } from './pages/admin/HoursLog'
import { EventTypes } from './pages/admin/EventTypes'
import { DesktopMode } from './pages/admin/DesktopMode'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SidebarLayout } from './components/SidebarLayout'
import { ThemeProvider } from './components/theme-provider'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <SidebarLayout>
                    <Dashboard />
                  </SidebarLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/discord"
              element={
                <ProtectedRoute>
                  <SidebarLayout>
                    <Discord />
                  </SidebarLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute adminOnly>
                  <SidebarLayout>
                    <Leaderboard />
                  </SidebarLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/user-details"
              element={
                <ProtectedRoute adminOnly>
                  <SidebarLayout>
                    <UserDetails />
                  </SidebarLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/hours-log"
              element={
                <ProtectedRoute adminOnly>
                  <SidebarLayout>
                    <HoursLog />
                  </SidebarLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/event-types"
              element={
                <ProtectedRoute adminOnly>
                  <SidebarLayout>
                    <EventTypes />
                  </SidebarLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/desktop-mode"
              element={
                <ProtectedRoute adminOnly>
                  <DesktopMode />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster theme="dark" />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
