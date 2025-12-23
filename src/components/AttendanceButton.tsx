import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui/button'
import { getEventStatus, isUserClockedIn, clockIn, clockOut } from '../lib/attendance'
import { isUserInAllowedLocation } from '../lib/location'
import { supabase } from '../lib/supabase'
import type { EventStatus } from '../lib/attendance'

export function AttendanceButton() {
  const { user } = useAuth()
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [allowedEventNames, setAllowedEventNames] = useState<Set<string>>(new Set())
  const isInitialMount = useRef(true)

  // Fetch event status and attendance status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Only set loading on initial mount
        if (isInitialMount.current) {
          setLoading(true)
        }

        // Fetch allowed event names from event_hour_types table
        const { data: eventTypesData } = await supabase
          .from('event_hour_types')
          .select('event_name')

        if (eventTypesData) {
          const eventNames = new Set(
            eventTypesData.map((e: { event_name: string }) => 
              e.event_name.toLowerCase().trim()
            )
          )
          setAllowedEventNames(eventNames)
        }

        // Fetch event status
        const event = await getEventStatus()
        setEventStatus(event)

        // Fetch user's attendance status if user exists
        if (user?.id) {
          const clockedIn = await isUserClockedIn(user.id)
          setIsClockedIn(clockedIn)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch status'
        setError(message)
        console.error('Error fetching status:', err)
      } finally {
        if (isInitialMount.current) {
          setLoading(false)
          isInitialMount.current = false
        }
      }
    }

    fetchStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  const handleClockInOut = async () => {
    if (!user?.id || !isEventValid || !eventStatus?.event) return

    try {
      setActionLoading(true)
      setLocationLoading(true)
      setError(null)
      setLocationMessage(null)

      // Check location first
      const locationResult = await isUserInAllowedLocation()
      setLocationMessage(locationResult.message)

      if (!locationResult.isAllowed) {
        setError(null)
        setActionLoading(false)
        setLocationLoading(false)
        return
      }

      // Clock in/out
      if (isClockedIn) {
        await clockOut(user.id)
        setIsClockedIn(false)
      } else {
        await clockIn(user.id)
        setIsClockedIn(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update attendance'
      setError(message)
      console.error('Error:', err)
    } finally {
      setActionLoading(false)
      setLocationLoading(false)
    }
  }

  // Check if event is active and has an allowed title
  const isEventActive = eventStatus?.inEvent ?? false
  const eventTitle = eventStatus?.event?.summary?.trim() ?? ''
  const isEventTypeAllowed = allowedEventNames.has(eventTitle.toLowerCase())
  const isEventValid = isEventActive && isEventTypeAllowed

  if (loading) {
    return (
      <Button disabled variant="outline">
        Loading...
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClockInOut}
        disabled={!isEventValid || actionLoading || locationLoading}
        variant={isClockedIn ? 'destructive' : 'default'}
        size="lg"
        className="w-full"
      >
        {actionLoading || locationLoading ? 'Processing...' : (isClockedIn ? 'Clock Out' : 'Clock In')}
      </Button>

      {!isEventActive && (
        <p className="text-sm text-destructive text-center">Event is inactive</p>
      )}

      {isEventActive && !isEventTypeAllowed && (
        <p className="text-sm text-destructive text-center">
          Clock in/out not available for this event
        </p>
      )}

      {locationMessage && (
        <p
          className={`text-sm text-center ${
            locationMessage.includes('are at') ? 'hidden' : 'text-destructive'
          }`}
        >
          {locationMessage}
        </p>
      )}

      {eventStatus?.event && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">{eventStatus.event.summary}</p>
          <p>
            {new Date(eventStatus.event.start).toLocaleDateString()} -{' '}
            {new Date(eventStatus.event.end).toLocaleDateString()}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}


