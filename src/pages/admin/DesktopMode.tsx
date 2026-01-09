import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { getEventStatus } from '@/lib/attendance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LogOut, CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  full_name: string
  email: string
}

interface AttendanceRecord {
  id: string
  user_id: string
  full_name: string
  clock_in_time: string
  clock_out_time: string | null
  hours_gained: string | null
}

export function DesktopMode() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserName, setSelectedUserName] = useState('')
  const [clockInTime, setClockInTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [activeEvent, setActiveEvent] = useState<any>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [comboboxOpen, setComboboxOpen] = useState(false)

  // Fetch users and attendance on mount and every 5 minutes
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all users
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id, full_name, email')

        if (userError) throw userError
        setUsers(userData || [])

        // Fetch active event
        const event = await getEventStatus()
        setActiveEvent(event)

        setLoading(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to fetch data')
        setLoading(false)
      }
    }

    // Set current date
    const today = new Date()
    setCurrentDate(today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))

    fetchData()

    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Refresh attendance whenever users or active event change
  useEffect(() => {
    if (users.length > 0) {
      refreshAttendance()
    }
  }, [users, activeEvent])

  const refreshAttendance = async () => {
    try {
      // Get all attendance records
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('*')
        .order('time', { ascending: true })

      if (error) throw error

      // Get all current events' time ranges
      const eventTimeRanges: Array<{ start: Date; end: Date }> = []
      if (activeEvent?.inEvent && activeEvent?.events) {
        for (const event of activeEvent.events) {
          eventTimeRanges.push({
            start: new Date(event.start),
            end: new Date(event.end),
          })
        }
      }

      // Helper function to check if a time falls within any event range
      const isTimeWithinAnyEvent = (time: Date): boolean => {
        return eventTimeRanges.some(range => time >= range.start && time <= range.end)
      }

      // Process attendance to build sessions per user
      const userSessions = new Map<string, Array<{ clockInTime: Date; clockOutTime?: Date }>>()

      for (const record of attendanceData || []) {
        const recordTime = new Date(record.time)

        const userId = record.user_id

        if (!userSessions.has(userId)) {
          userSessions.set(userId, [])
        }

        const sessions = userSessions.get(userId)!

        if (record.action === 'clock_in') {
          // Only include clock_in if it's within an active event's time range
          if (isTimeWithinAnyEvent(recordTime)) {
            sessions.push({ clockInTime: new Date(record.time) })
          }
        } else if (record.action === 'clock_out' && sessions.length > 0) {
          // Close the last session
          sessions[sessions.length - 1].clockOutTime = new Date(record.time)
        }
      }

      // Build attendance records table
      const records: AttendanceRecord[] = []

      for (const [userId, sessions] of userSessions) {
        const user = users.find((u) => u.id === userId)
        if (!user) continue

        // Create a row for each session
        sessions.forEach((session, index) => {
          const clockInTime = session.clockInTime
          const clockOutTime = session.clockOutTime

          if (!clockOutTime) {
            // Still clocked in
            records.push({
              id: `${userId}-${index}`,
              user_id: userId,
              full_name: user.full_name,
              clock_in_time: clockInTime.toLocaleTimeString(),
              clock_out_time: null,
              hours_gained: null,
            })
          } else {
            // Clocked out - calculate hours
            const diffMs = clockOutTime.getTime() - clockInTime.getTime()
            const hours = Math.floor(diffMs / (1000 * 60 * 60))
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
            const hoursGained = `${hours}h ${minutes}m`

            records.push({
              id: `${userId}-${index}`,
              user_id: userId,
              full_name: user.full_name,
              clock_in_time: clockInTime.toLocaleTimeString(),
              clock_out_time: clockOutTime.toLocaleTimeString(),
              hours_gained: hoursGained,
            })
          }
        })
      }

      setAttendance(records)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch attendance')
    }
  }

  const handleClockIn = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }

    // Check if user is already in the table (clocked in)
    const isUserClocked = attendance.some(
      (a) => a.user_id === selectedUserId && !a.clock_out_time
    )

    if (isUserClocked) {
      toast.error('User is already clocked in')
      return
    }

    try {
      // Check if user is approved
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('approval_status')
        .eq('id', selectedUserId)
        .single()

      if (profileError) throw profileError
      if (profile?.approval_status !== 'approved') {
        toast.error('User is not approved to clock in')
        return
      }

      // If custom time is provided, insert directly to attendance table
      if (clockInTime) {
        // Convert time (HH:mm) to full ISO timestamp for today
        const today = new Date()
        const [hours, minutes] = clockInTime.split(':')
        const customTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes))
        
        // Check if time is in the future
        if (customTime > new Date()) {
          toast.error('Cannot clock in with a future time')
          return
        }
        
        const { error: insertError } = await supabase.from('attendance').insert({
          user_id: selectedUserId,
          action: 'clock_in',
          hour_type: null,
          time: customTime.toISOString(),
        })

        if (insertError) throw insertError
      } else {
        // Use server time via RPC function
        const { error: clockError } = await supabase.rpc('clock_in_out', {
          p_user_id: selectedUserId,
          p_action: 'clock_in',
        })

        if (clockError) {
          throw new Error(clockError.message || 'Failed to clock in user')
        }
      }

      toast.success('User clocked in successfully')
      setSelectedUserId('')
      setSelectedUserName('')
      setClockInTime('')
      setComboboxOpen(false)
      await refreshAttendance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clock in user')
    }
  }

  const handleClockOut = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('clock_in_out', {
        p_user_id: userId,
        p_action: 'clock_out',
      })

      if (error) {
        throw new Error(error.message || 'Failed to clock out user')
      }

      toast.success('User clocked out successfully')
      await refreshAttendance()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clock out user'
      toast.error(errorMessage)
    }
  }

  const handleClockOutEveryone = async () => {
    try {
      const clockedInUsers = attendance.filter((a) => !a.clock_out_time)

      for (const record of clockedInUsers) {
        await supabase.rpc('clock_in_out', {
          p_user_id: record.user_id,
          p_action: 'clock_out',
        })
      }

      toast.success(`Clocked out ${clockedInUsers.length} users`)
      setAlertOpen(false)
      await refreshAttendance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clock out users')
      setAlertOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const clockedInUsers = attendance.filter((a) => !a.clock_out_time)

  return (
    <>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="border-b bg-card p-6 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Desktop Mode</h1>
            <p className="text-lg text-muted-foreground">{currentDate}</p>
          </div>
          <hr />
          {/* Active Event */}
          <div className="rounded-lg flex items-center justify-between">
            <div>
              {activeEvent?.inEvent ? (
                <div>
                  <p className="font-semibold text-lg">{activeEvent.event?.summary}</p>
                  <p className="text-sm text-muted-foreground">
                    {activeEvent.event && (
                      <>
                        {new Date(activeEvent.event.start).toLocaleDateString()} -{' '}
                        {new Date(activeEvent.event.end).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">No active event</p>
              )}
            </div>
            <Button
              onClick={() => setAlertOpen(true)}
              disabled={clockedInUsers.length === 0}
              variant="destructive"
              size="sm"
            >
              Clock Out Everyone ({clockedInUsers.length})
            </Button>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-lg border bg-card mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Clock In Time</TableHead>
                  <TableHead className="text-right">Clock Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No attendance records
                    </TableCell>
                  </TableRow>
                ) : (
                  attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.full_name}</TableCell>
                      <TableCell>{record.clock_in_time}</TableCell>
                      <TableCell className="text-right">
                        {record.clock_out_time ? (
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-sm">{record.clock_out_time}</span>
                            <span className="text-xs text-muted-foreground">{record.hours_gained}</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleClockOut(record.user_id)}
                            className="gap-2"
                          >
                            <LogOut size={16} />
                            Clock Out
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Clock In Section */}
        <div className="border-t bg-card p-6">
          <div className="flex gap-2 max-w-2xl">
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-[200px] justify-between"
                >
                  {selectedUserName || 'Select a user...'}
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command shouldFilter={true}>
                  <CommandInput placeholder="Search users..." />
                  <CommandEmpty>No user found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {users.map((user) => {
                        // Check if user is currently clocked in
                        const isClockedIn = attendance.some(
                          (a) => a.user_id === user.id && !a.clock_out_time
                        )

                        // Don't show clocked-in users
                        if (isClockedIn) return null

                        return (
                          <CommandItem
                            key={user.id}
                            value={user.full_name}
                            onSelect={() => {
                              setSelectedUserId(user.id)
                              setSelectedUserName(user.full_name)
                              setComboboxOpen(false)
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedUserId === user.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {user.full_name}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button onClick={handleClockIn} disabled={!selectedUserId}>
              Clock In
            </Button>
            <Input
              type="time"
              value={clockInTime}
              onChange={(e) => setClockInTime(e.target.value)}
              className="w-32"
            />
          </div>
        </div>

        {/* Clock Out Everyone Alert */}
        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clock Out Everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clock out {clockedInUsers.length} user{clockedInUsers.length !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleClockOutEveryone} variant="destructive">
              Clock Out All
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  )
}
