import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui/button'
import { getEventStatus, isUserClockedIn, clockIn, clockOut } from '../lib/attendance'
import { isUserInAllowedLocation } from '../lib/location'
import { supabase } from '../lib/supabase'
import type { EventStatus, Event } from '../lib/attendance'

export function AttendanceButton() {
  const { user } = useAuth()
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [matchedEvent, setMatchedEvent] = useState<{ name: string; event: Event } | null>(null)
  const [lastClockInTime, setLastClockInTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState<{ hours: number; minutes: number }>({ hours: 0, minutes: 0 })
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

        let eventNames = new Set<string>()
        if (eventTypesData) {
          eventNames = new Set(
            eventTypesData.map((e: { event_name: string }) => 
              e.event_name.toLowerCase().trim()
            )
          )
        }

        // Fetch event status
        const eventStatusData = await getEventStatus()
        setEventStatus(eventStatusData)

        // Check if any event in the array matches allowed event names
        let matched: { name: string; event: Event } | null = null
        if (eventStatusData.inEvent) {
          const eventsArray = eventStatusData.events || []
          for (const evt of eventsArray) {
            const eventName = evt.summary?.toLowerCase().trim() ?? ''
            if (eventNames.has(eventName)) {
              matched = { name: evt.summary, event: evt }
              break
            }
          }
        }
        setMatchedEvent(matched)

        // Fetch user's attendance status if user exists
        if (user?.id) {
          const clockedIn = await isUserClockedIn(user.id)
          setIsClockedIn(clockedIn)

          // If clocked in, fetch the last clock in time
          if (clockedIn) {
            const { data: lastRecord } = await supabase
              .from('attendance')
              .select('time')
              .eq('user_id', user.id)
              .order('time', { ascending: false })
              .limit(1)
              .single()

            if (lastRecord) {
              setLastClockInTime(new Date(lastRecord.time))
            }
          } else {
            setLastClockInTime(null)
          }
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

  // Update elapsed time every second when clocked in
  useEffect(() => {
    if (!isClockedIn || !lastClockInTime) {
      setElapsedTime({ hours: 0, minutes: 0 })
      return
    }

    const updateElapsedTime = () => {
      const now = new Date()
      const diffMs = now.getTime() - lastClockInTime.getTime()
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      setElapsedTime({ hours, minutes })
    }

    updateElapsedTime()
    const interval = setInterval(updateElapsedTime, 1000)
    return () => clearInterval(interval)
  }, [isClockedIn, lastClockInTime])

  const handleClockInOut = async () => {
    if (!user?.id || !matchedEvent) return

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
        setLastClockInTime(null)
      } else {
        await clockIn(user.id)
        setIsClockedIn(true)
        setLastClockInTime(new Date())
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

  // Check if event is active and has a matched allowed event
  const isEventActive = eventStatus?.inEvent ?? false
  const isEventValid = isEventActive && matchedEvent !== null

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

      {isClockedIn && (
        <div className="rounded-lg border border-green-600 bg-green-50 dark:bg-green-950 p-3">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">
            Signed In For: {elapsedTime.hours}h {elapsedTime.minutes}m
          </p>
        </div>
      )}

      {!isEventActive && (
        <p className="text-sm text-destructive text-center">Event is inactive</p>
      )}

      {isEventActive && !matchedEvent && (
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

      {matchedEvent && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">{matchedEvent.name}</p>
          <p>
            {new Date(matchedEvent.event.start).toLocaleDateString()} -{' '}
            {new Date(matchedEvent.event.end).toLocaleDateString()}
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


