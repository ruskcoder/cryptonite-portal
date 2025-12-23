import { useAuth } from '../context/AuthContext'
import { AttendanceButton } from '../components/AttendanceButton'

export function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Logged in as: {user?.email}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 max-w-md">
        <h3 className="text-xl font-semibold mb-4">Attendance</h3>
        <AttendanceButton />
      </div>
    </div>
  )
}
