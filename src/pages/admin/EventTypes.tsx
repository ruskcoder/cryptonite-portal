import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'

interface EventType {
  id: string
  event_name: string
  hour_type: 'PR' | 'Build'
  created_at: string
  updated_at: string
}

export function EventTypes() {
  const [events, setEvents] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newEventName, setNewEventName] = useState('')
  const [newEventType, setNewEventType] = useState<'PR' | 'Build'>('Build')
  const [isAdding, setIsAdding] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('event_hour_types')
        .select('*')
        .order('event_name', { ascending: true })

      if (err) throw err
      setEvents(data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events'
      setError(message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEvent = async () => {
    try {
      if (!newEventName.trim()) {
        toast.error('Please enter an event name')
        return
      }

      setIsAdding(true)

      const { data, error: err } = await supabase
        .from('event_hour_types')
        .insert({
          event_name: newEventName.trim(),
          hour_type: newEventType,
        })
        .select()

      if (err) throw err

      if (data) {
        setEvents([...events, data[0]])
        setNewEventName('')
        setNewEventType('Build')
        toast.success('Event added successfully')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add event')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    setPendingDeleteId(id)
    setAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return

    try {
      const { error: err } = await supabase.from('event_hour_types').delete().eq('id', pendingDeleteId)

      if (err) throw err

      setEvents(events.filter((e) => e.id !== pendingDeleteId))
      toast.success('Event deleted successfully')
      setAlertOpen(false)
      setPendingDeleteId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete event')
      setAlertOpen(false)
      setPendingDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading event types...</p>
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Event Types</h1>
        <p className="text-muted-foreground">Manage event to hour type mappings</p>
      </div>

      {/* Add Event Section */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h2 className="font-semibold">Add New Event</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              placeholder="e.g., RSC Activities"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddEvent()
                }
              }}
            />
          </div>
          <div className="w-40">
            <Label htmlFor="event-type">Hour Type</Label>
            <Select value={newEventType} onValueChange={(value) => setNewEventType(value as 'PR' | 'Build')}>
              <SelectTrigger id="event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PR">PR</SelectItem>
                <SelectItem value="Build">Build</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddEvent} disabled={isAdding || !newEventName.trim()}>
              {isAdding ? 'Adding...' : 'Add Event'}
            </Button>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Name</TableHead>
              <TableHead className="w-32">Hour Type</TableHead>
              <TableHead className="text-right w-16">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No events configured yet
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.event_name}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        event.hour_type === 'PR'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {event.hour_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="gap-2"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Alert Dialog for deletion confirmation */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event type? This action cannot be undone.
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
