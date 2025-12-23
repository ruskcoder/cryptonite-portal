import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { GOOGLE_SCRIPT_API } from '../lib/constants'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'

interface AttendanceRecord {
  id: string
  user_id: string
  action: 'clock_in' | 'clock_out'
  hour_type: 'PR' | 'Build' | null
  time: string
}

interface GoogleEvent {
  summary: string
  start: string
  end: string
}

interface UserHours {
  userId: string
  fullName: string
  totalHours: number
  totalMinutes: number
  totalSeconds: number
  prHours: number
  prMinutes: number
  prSeconds: number
  buildHours: number
  buildMinutes: number
  buildSeconds: number
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<UserHours[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all events from Google Apps Script
        const eventsResponse = await fetch(`${GOOGLE_SCRIPT_API}?all=true`)
        const eventsData = (await eventsResponse.json()) as { events: GoogleEvent[] }
        const allEvents = eventsData.events || []

        // Fetch all event_hour_types mappings
        const { data: eventHourTypesData, error: eventHourTypesError } = await supabase
          .from('event_hour_types')
          .select('*')

        if (eventHourTypesError) throw eventHourTypesError

        const eventHourTypeMap = new Map<string, 'PR' | 'Build'>(
          (eventHourTypesData || []).map((e: { event_name: string; hour_type: 'PR' | 'Build' }) => [
            e.event_name.toLowerCase().trim(),
            e.hour_type,
          ])
        )

        // Fetch all attendance records
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .order('time', { ascending: true })

        if (attendanceError) throw attendanceError

        // Get unique user IDs from attendance records
        const userIds = Array.from(new Set(attendanceData?.map((record: AttendanceRecord) => record.user_id) || []))

        // Fetch user info for each user ID using the secure RPC function
        const userNameMap = new Map<string, string>()

        console.log('Fetching user info for userIds:', userIds)

        for (const userId of userIds) {
          const { data: userInfo, error: userError } = await supabase.rpc('get_user_info', {
            p_user_id: userId,
          })

          console.log(`get_user_info(${userId}):`, userInfo, userError)

          if (!userError && userInfo) {
            // userInfo is an array with one element from the table return
            const fullName = Array.isArray(userInfo) ? userInfo[0]?.display_name : userInfo?.display_name
            if (fullName) {
              userNameMap.set(userId, fullName)
            }
          }
        }

        // Helper function to find event at a specific time
        const findEventAtTime = (timestamp: string): GoogleEvent | null => {
          const time = new Date(timestamp).getTime()
          return allEvents.find((event) => {
            const start = new Date(event.start).getTime()
            const end = new Date(event.end).getTime()
            return time >= start && time < end
          }) || null
        }

        // Helper function to get hour type for a record
        const getHourTypeForRecord = (record: AttendanceRecord): 'PR' | 'Build' => {
          // If hour_type is already set, use it
          if (record.hour_type) {
            return record.hour_type
          }

          // If not set, find the event and look up its hour type
          const event = findEventAtTime(record.time)
          if (event) {
            const eventNameLower = event.summary.toLowerCase().trim()
            const mappedType = eventHourTypeMap.get(eventNameLower)
            console.log(
              `Event "${event.summary}" (${eventNameLower}) at ${record.time} -> ${mappedType || 'not found in map'}`
            )
            if (mappedType) {
              return mappedType
            }
          } else {
            console.log(`No event found at ${record.time}. Available events:`, allEvents.slice(0, 5))
          }

          // Default to Build if not found
          return 'Build'
        }

        // Calculate hours for each user
        const userHoursMap = new Map<
          string,
          { totalMs: number; prMs: number; buildMs: number }
        >()

        // Initialize map with all users
        userIds.forEach((userId) => {
          userHoursMap.set(userId, { totalMs: 0, prMs: 0, buildMs: 0 })
        })

        // Group attendance by user for proper pairing
        const attendanceByUser = new Map<string, AttendanceRecord[]>()
        attendanceData?.forEach((record: AttendanceRecord) => {
          if (!attendanceByUser.has(record.user_id)) {
            attendanceByUser.set(record.user_id, [])
          }
          attendanceByUser.get(record.user_id)?.push(record)
        })

        // Process each user's attendance records and pair clock_in with clock_out
        attendanceByUser.forEach((userRecords, userId) => {
          const userData = userHoursMap.get(userId) || { totalMs: 0, prMs: 0, buildMs: 0 }

          // Sort records by time to ensure proper pairing
          const sortedRecords = [...userRecords].sort((a, b) => 
            new Date(a.time).getTime() - new Date(b.time).getTime()
          )

          // Track pending clock_ins to pair with next clock_out
          const pendingClockIns: AttendanceRecord[] = []
          const usedClockOuts = new Set<string>()

          // Process records in time order
          for (const record of sortedRecords) {
            if (record.action === 'clock_in') {
              pendingClockIns.push(record)
            } else if (record.action === 'clock_out' && !usedClockOuts.has(record.id)) {
              // Find the first pending clock_in with matching hour_type
              const matchingIndex = pendingClockIns.findIndex(
                (ci) => ci.hour_type === record.hour_type
              )

              if (matchingIndex !== -1) {
                const clockInRecord = pendingClockIns.splice(matchingIndex, 1)[0]
                const clockInTime = new Date(clockInRecord.time).getTime()
                const clockOutTime = new Date(record.time).getTime()
                const durationMs = clockOutTime - clockInTime

                if (durationMs > 0) {
                  // Use the hour_type from the CLOCK_IN record, default to 'Build'
                  const hourType = clockInRecord.hour_type || 'Build'
                  console.log(
                    `Pair: ${clockInRecord.time} (${hourType}) -> ${record.time} = ${durationMs}ms`
                  )

                  userData.totalMs += durationMs
                  if (hourType === 'PR') {
                    userData.prMs += durationMs
                  } else {
                    userData.buildMs += durationMs
                  }

                  usedClockOuts.add(record.id)
                }
              }
            }
          }

          userHoursMap.set(userId, userData)
        })

        // Convert map to array and calculate hours/minutes
        const leaderboardData: UserHours[] = []

        console.log('Processing leaderboard data...')
        console.log('Event hour types:', eventHourTypesData)
        console.log('Attendance records count:', attendanceData?.length)
        console.log('Unique userIds:', userIds)
        console.log('userNameMap:', userNameMap)

        userHoursMap.forEach((userData, userId) => {
          const fullName = userNameMap.get(userId)
          console.log(`User ${userId} (${fullName}): prMs=${userData.prMs}, buildMs=${userData.buildMs}, totalMs=${userData.totalMs}`)
          if (fullName) {
            const totalSeconds = Math.floor(userData.totalMs / 1000)
            const totalHours = Math.floor(totalSeconds / 3600)
            const totalMinutes = Math.floor((totalSeconds % 3600) / 60)
            const totSecs = totalSeconds % 60

            const prSeconds = Math.floor(userData.prMs / 1000)
            const prHours = Math.floor(prSeconds / 3600)
            const prMinutes = Math.floor((prSeconds % 3600) / 60)
            const prSecs = prSeconds % 60

            const buildSeconds = Math.floor(userData.buildMs / 1000)
            const buildHours = Math.floor(buildSeconds / 3600)
            const buildMinutes = Math.floor((buildSeconds % 3600) / 60)
            const buildSecs = buildSeconds % 60

            leaderboardData.push({
              userId,
              fullName,
              totalHours,
              totalMinutes,
              totalSeconds: totSecs,
              prHours,
              prMinutes,
              prSeconds: prSecs,
              buildHours,
              buildMinutes,
              buildSeconds: buildSecs,
            })
          }
        })

        // Sort by hours descending, then by minutes descending
        leaderboardData.sort((a, b) => {
          if (a.totalHours !== b.totalHours) {
            return b.totalHours - a.totalHours
          }
          return b.totalMinutes - a.totalMinutes
        })

        console.log('Final leaderboard data:', leaderboardData)

        setLeaderboard(leaderboardData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch leaderboard'
        setError(message)
        console.error('Error fetching leaderboard:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading leaderboard...</p>
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
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Total hours logged by team members</p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">PR Hours</TableHead>
              <TableHead className="text-right">Build Hours</TableHead>
              <TableHead className="text-right">Total Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No attendance records yet
                </TableCell>
              </TableRow>
            ) : (
              leaderboard.map((user, index) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-semibold">#{index + 1}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell className="text-right">{user.prHours}h {user.prMinutes}m {user.prSeconds}s</TableCell>
                  <TableCell className="text-right">{user.buildHours}h {user.buildMinutes}m {user.buildSeconds}s</TableCell>
                  <TableCell className="text-right font-semibold">
                    {user.totalHours}h {user.totalMinutes}m {user.totalSeconds}s
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
