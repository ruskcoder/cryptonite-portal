import { Fragment, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { clockIn, clockOut, isUserClockedIn } from '@/lib/attendance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  full_name: string
  phone_number: string
  katy_number: string
  grade: number
  parent_email: string
  parent_phone: string
  address: string
  role?: 'user' | 'admin'
  approval_status?: 'approved' | 'denied'
}

interface UserRow extends UserProfile {
  isClockedIn: boolean
}

interface UserDetailsRowProps {
  user: UserRow
  isSelected: boolean
  onSelectChange: (userId: string) => void
  onClockInOut: (userId: string) => void
  onSaveUser: (user: UserProfile) => void
  onDeleteUser: (userId: string) => void
  onApproveUser: (userId: string) => void
  clockInTime: string
  onClockInTimeChange: (userId: string, time: string) => void
}

function UserDetailsRow({
  user,
  isSelected,
  onSelectChange,
  onClockInOut,
  onSaveUser,
  onDeleteUser,
  onApproveUser,
  clockInTime,
  onClockInTimeChange,
}: UserDetailsRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile>({ ...user })

  const handleSave = () => {
    onSaveUser(editingUser)
    setIsOpen(false)
  }

  return (
    <Fragment>
      <TableRow>
        <TableCell className="w-12">
          <Checkbox checked={isSelected} onCheckedChange={() => onSelectChange(user.id)} />
        </TableCell>
        <TableCell className="w-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 h-auto"
          >
            {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{user.full_name}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {user.approval_status !== 'denied' && (
              <span className={user.isClockedIn ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
                {user.isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </span>
            )}
            {user.approval_status === 'denied' && (
              <Button size="sm" variant="default" onClick={() => onApproveUser(user.id)}>
                Approve
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={clockInTime}
              onChange={(e) => onClockInTimeChange(user.id, e.target.value)}
              className="w-32"
            />
            <Button
              size="sm"
              variant={user.isClockedIn ? 'destructive' : 'default'}
              onClick={() => onClockInOut(user.id)}
              disabled={user.approval_status === 'denied'}
            >
              {user.isClockedIn ? 'Clock Out' : 'Clock In'}
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={5} className="py-0">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleContent className="bg-muted/50 p-6">
              <div className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={editingUser.full_name || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={editingUser.email || ''} disabled />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={editingUser.phone_number || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, phone_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Katy Number</Label>
                    <Input
                      value={editingUser.katy_number || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, katy_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Grade</Label>
                    <Input
                      type="number"
                      value={editingUser.grade || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, grade: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Parent Email</Label>
                    <Input
                      value={editingUser.parent_email || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, parent_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Parent Phone</Label>
                    <Input
                      value={editingUser.parent_phone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, parent_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={editingUser.address || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select
                      value={editingUser.role || 'user'}
                      onValueChange={(value) => setEditingUser({ ...editingUser, role: value as 'user' | 'admin' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Approval Status</Label>
                    <Input value={editingUser.approval_status || 'denied'} disabled />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave}>Save</Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onDeleteUser(user.id)
                      setIsOpen(false)
                    }}
                    className="gap-2"
                  >
                    <Trash2 size={16} /> Delete User
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </TableCell>
      </TableRow>
    </Fragment>
  )
}

export function UserDetails() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [addHours, setAddHours] = useState({ hours: 0, minutes: 0, hourType: 'Build' as 'Build' | 'PR' })
  const [clockInTimes, setClockInTimes] = useState<Record<string, string>>({})
  const [alertOpen, setAlertOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase.from('profiles').select('*')

      if (err) throw err

      // Get clock in status for each user
      const usersWithStatus: UserRow[] = []
      for (const user of data || []) {
        const isClockedIn = await isUserClockedIn(user.id)
        usersWithStatus.push({
          ...(user as UserProfile),
          isClockedIn,
        })
      }

      setUsers(usersWithStatus)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users'
      setError(message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSelect = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleSaveUser = async (user: UserProfile) => {
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({
          full_name: user.full_name,
          phone_number: user.phone_number,
          katy_number: user.katy_number,
          grade: user.grade,
          parent_email: user.parent_email,
          parent_phone: user.parent_phone,
          address: user.address,
          role: user.role,
        })
        .eq('id', user.id)

      if (err) throw err

      setUsers(users.map((u) => (u.id === user.id ? { ...u, ...user } : u)))
      toast.success('User saved successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setPendingDeleteId(userId)
    setAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return

    try {
      const { data, error: err } = await supabase.rpc('delete_user', {
        p_user_id: pendingDeleteId,
      })

      if (err) throw err
      if (data && !data.success) throw new Error(data.message || 'Failed to delete user')

      setUsers(users.filter((u) => u.id !== pendingDeleteId))
      toast.success('User deleted successfully')
      setAlertOpen(false)
      setPendingDeleteId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user')
      setAlertOpen(false)
      setPendingDeleteId(null)
    }
  }

  const handleApproveUser = async (userId: string) => {
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ approval_status: 'approved' })
        .eq('id', userId)

      if (err) throw err

      setUsers(users.map((u) => (u.id === userId ? { ...u, approval_status: 'approved' } : u)))
      toast.success('User approved successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve user')
    }
  }

  const handleClockInOut = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId)
      if (!user) return

      if (user.isClockedIn) {
        await clockOut(userId)
      } else {
        const customTime = clockInTimes[userId]
        
        // If custom time is provided, validate and use it
        if (customTime) {
          const today = new Date()
          const [hours, minutes] = customTime.split(':')
          const clockTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes))
          
          // Check if time is in the future
          if (clockTime > new Date()) {
            toast.error('Cannot clock in with a future time')
            return
          }
          
          // Insert directly to attendance table with custom time
          const { error: insertError } = await supabase.from('attendance').insert({
            user_id: userId,
            action: 'clock_in',
            hour_type: null,
            time: clockTime.toISOString(),
          })

          if (insertError) throw insertError
          
          // Clear the time input after successful clock in
          setClockInTimes({ ...clockInTimes, [userId]: '' })
        } else {
          // Use server time via RPC function
          await clockIn(userId)
        }
      }

      // Refresh clock in status
      const isClockedIn = await isUserClockedIn(userId)
      setUsers(users.map((u) => (u.id === userId ? { ...u, isClockedIn } : u)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update attendance')
    }
  }

  const handleBulkClockOut = async () => {
    try {
      for (const userId of selectedUsers) {
        await clockOut(userId)
      }

      // Refresh all users
      await fetchUsers()
      setSelectedUsers(new Set())
      toast.success('Selected users clocked out successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clock out users')
    }
  }

  const handleAddHours = async () => {
    try {
      if (selectedUsers.size === 0) {
        toast.error('Please select at least one user')
        return
      }

      const totalMs = (addHours.hours * 3600 + addHours.minutes * 60) * 1000
      const now = new Date()
      const clockOutTime = new Date(now.getTime() + totalMs)

      for (const userId of selectedUsers) {
        // Create clock in record
        await supabase.from('attendance').insert({
          user_id: userId,
          action: 'clock_in',
          hour_type: addHours.hourType,
          time: now.toISOString(),
        })

        // Create clock out record
        await supabase.from('attendance').insert({
          user_id: userId,
          action: 'clock_out',
          hour_type: addHours.hourType,
          time: clockOutTime.toISOString(),
        })
      }

      setAddHours({ hours: 0, minutes: 0, hourType: 'Build' })
      setSelectedUsers(new Set())
      await fetchUsers()
      toast.success('Hours added successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add hours')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading users...</p>
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

  const anyUsersClockedIn = users.some((u) => u.isClockedIn)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">User Details</h1>
        <p className="text-muted-foreground">Manage user information and attendance</p>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={selectedUsers.size === 0 || !anyUsersClockedIn}
          onClick={handleBulkClockOut}
        >
          Clock Out Selected ({selectedUsers.size})
        </Button>
      </div>

      {/* Add Hours Section */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h2 className="font-semibold">Add Hours</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Hours</Label>
            <Input
              type="number"
              min="0"
              value={addHours.hours}
              onChange={(e) => setAddHours({ ...addHours, hours: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>Minutes</Label>
            <Input
              type="number"
              min="0"
              max="59"
              value={addHours.minutes}
              onChange={(e) => setAddHours({ ...addHours, minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>Hour Type</Label>
            <Select value={addHours.hourType} onValueChange={(value) => setAddHours({ ...addHours, hourType: value as 'Build' | 'PR' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Build">Build</SelectItem>
                <SelectItem value="PR">PR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddHours} disabled={selectedUsers.size === 0} className="w-full">
              Add Hours
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onCheckedChange={(checked: boolean | string) => {
                    if (checked) {
                      setSelectedUsers(new Set(users.map((u) => u.id)))
                    } else {
                      setSelectedUsers(new Set())
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Manual Clock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <UserDetailsRow
                key={user.id}
                user={user}
                isSelected={selectedUsers.has(user.id)}
                onSelectChange={handleToggleSelect}
                onClockInOut={handleClockInOut}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                onApproveUser={handleApproveUser}
                clockInTime={clockInTimes[user.id] || ''}
                onClockInTimeChange={(userId, time) => setClockInTimes({ ...clockInTimes, [userId]: time })}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={confirmDelete} variant="destructive">
              Delete
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
