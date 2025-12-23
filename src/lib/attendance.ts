import { supabase } from './supabase'
import { GOOGLE_SCRIPT_API } from './constants'

export interface Event {
  summary: string
  start: string
  end: string
}

export interface EventStatus {
  inEvent: boolean
  event: Event | null
}

export interface AttendanceRecord {
  id: string
  user_id: string
  action: 'clock_in' | 'clock_out'
  hour_type: 'PR' | 'Build'
  time: string
}

/**
 * Fetch the current event status from Google Apps Script API
 */
export const getEventStatus = async (): Promise<EventStatus> => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_API)
    const data = await response.json()
    return data as EventStatus
  } catch (error) {
    console.error('Error fetching event status:', error)
    throw error
  }
}

/**
 * Get the hour type for a given event name
 */
export const getHourTypeForEvent = async (eventName: string): Promise<'PR' | 'Build'> => {
  try {
    const { data, error } = await supabase
      .from('event_hour_types')
      .select('hour_type')
      .eq('event_name', eventName)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine - we'll default to Build
      console.error('Error fetching hour type:', error)
    }

    // Default to 'Build' if not found
    return data?.hour_type === 'PR' ? 'PR' : 'Build'
  } catch (error) {
    console.error('Error getting hour type:', error)
    // Default to Build on any error
    return 'Build'
  }
}

/**
 * Get the user's last attendance record
 */
export const getLastAttendance = async (userId: string): Promise<AttendanceRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .order('time', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Error fetching last attendance:', error)
      throw error
    }

    return data as AttendanceRecord | null
  } catch (error) {
    console.error('Error getting last attendance:', error)
    return null
  }
}

/**
 * Check if user is currently clocked in
 * Fetches all attendance records and counts clock_in vs clock_out
 * If there are more clock_ins than clock_outs, user is clocked in
 */
export const isUserClockedIn = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('action')
      .eq('user_id', userId)
      .order('time', { ascending: true })

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching attendance:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return false
    }

    // Count clock_in and clock_out actions
    let clockInCount = 0
    let clockOutCount = 0

    data.forEach((record: { action: string }) => {
      if (record.action === 'clock_in') {
        clockInCount++
      } else if (record.action === 'clock_out') {
        clockOutCount++
      }
    })

    // User is clocked in if there are more clock_ins than clock_outs
    return clockInCount > clockOutCount
  } catch (error) {
    console.error('Error checking if user is clocked in:', error)
    return false
  }
}

/**
 * Clock in the user
 * Uses server-side function to automatically set timestamp
 * Hour type is not sent (only admins can set it later)
 */
export const clockIn = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('clock_in_out', {
      p_user_id: userId,
      p_action: 'clock_in',
    })

    if (error) {
      const message = error.message || 'Failed to clock in'
      throw new Error(message)
    }
    console.log('Clocked in successfully')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clock in'
    console.error('Error clocking in:', message)
    throw new Error(message)
  }
}

/**
 * Clock out the user
 * Uses server-side function to automatically set timestamp
 * Hour type is not sent (only admins can set it later)
 */
export const clockOut = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('clock_in_out', {
      p_user_id: userId,
      p_action: 'clock_out',
    })

    if (error) {
      const message = error.message || 'Failed to clock out'
      throw new Error(message)
    }
    console.log('Clocked out successfully')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clock out'
    console.error('Error clocking out:', message)
    throw new Error(message)
  }
}
