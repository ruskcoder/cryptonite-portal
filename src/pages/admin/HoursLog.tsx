import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'

interface AttendanceWithUser {
  id: string
  user_id: string
  fullName: string
  action: 'clock_in' | 'clock_out'
  hour_type: 'PR' | 'Build' | null
  time: string
}

export function HoursLog() {
  const [records, setRecords] = useState<AttendanceWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHoursLog()
  }, [])

  const fetchHoursLog = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .order('time', { ascending: false })

      if (attendanceError) throw attendanceError

      // Get unique user IDs
      const userIds = Array.from(new Set((attendanceData || []).map((r: any) => r.user_id)))

      // Fetch user info for each ID
      const userNameMap = new Map<string, string>()
      for (const userId of userIds) {
        const { data: userInfo } = await supabase.rpc('get_user_info', {
          p_user_id: userId,
        })

        if (userInfo) {
          const fullName = Array.isArray(userInfo) ? userInfo[0]?.display_name : userInfo?.display_name
          if (fullName) {
            userNameMap.set(userId, fullName)
          }
        }
      }

      // Map attendance records with user names
      const recordsWithNames: AttendanceWithUser[] = (attendanceData || []).map((record: any) => ({
        id: record.id,
        user_id: record.user_id,
        fullName: userNameMap.get(record.user_id) || 'Unknown',
        action: record.action,
        hour_type: record.hour_type,
        time: record.time,
      }))

      setRecords(recordsWithNames)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch hours log'
      setError(message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading hours log...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold">Hours Log</h1>
        <p className="text-muted-foreground">View all attendance records</p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Hour Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No attendance records
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.fullName}</TableCell>
                  <TableCell>{new Date(record.time).toLocaleString()}</TableCell>
                  <TableCell>
                    <span
                      className={
                        record.action === 'clock_in'
                          ? 'text-green-600 font-semibold'
                          : 'text-red-600 font-semibold'
                      }
                    >
                      {record.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {record.hour_type ? (
                      <span className={record.hour_type === 'PR' ? 'text-blue-600' : 'text-purple-600'}>
                        {record.hour_type}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
