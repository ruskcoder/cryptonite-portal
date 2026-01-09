import { ALLOWED_LOCATIONS, SHAW_CENTER_IP } from './constants'

export interface UserLocation {
  lat: number
  lng: number
  accuracy: number
}

/**
 * Get user's current IP address
 */
export const getUserIp = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || null
  } catch (error) {
    console.error('Failed to get IP:', error)
    return null
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Request user's current location
 */
export const getUserLocation = async (): Promise<UserLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        const message =
          error.code === 1
            ? 'Location permission denied. Please allow location access to clock in/out.'
            : error.code === 2
              ? 'Location unavailable. Please ensure location services are enabled.'
              : 'Error getting location. Please try again.'
        reject(new Error(message))
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )
  })
}

/**
 * Check if user is within an allowed location
 * First checks IP address, if it matches allowed IP, no geolocation needed
 * Otherwise requires geolocation within allowed radius
 */
export const isUserInAllowedLocation = async (): Promise<{
  isAllowed: boolean
  location: UserLocation | null
  nearestLocation: (typeof ALLOWED_LOCATIONS)[0] | null
  distance: number | null
  message: string
}> => {
  try {
    // First, check if user's IP matches the allowed IP
    const userIp = await getUserIp()
    if (userIp === SHAW_CENTER_IP) {
      return {
        isAllowed: true,
        location: null,
        nearestLocation: ALLOWED_LOCATIONS[0],
        distance: 0,
        message: `You are at ${ALLOWED_LOCATIONS[0].address} (verified by IP)`,
      }
    }

    // If IP doesn't match, fall back to geolocation
    const userLoc = await getUserLocation()

    let nearestLocation = null
    let minDistance = Infinity

    // Check distance to each allowed location
    for (const allowedLoc of ALLOWED_LOCATIONS) {
      const distance = calculateDistance(userLoc.lat, userLoc.lng, allowedLoc.lat, allowedLoc.lng)
      if (distance < minDistance) {
        minDistance = distance
        nearestLocation = allowedLoc
      }
    }

    if (nearestLocation && minDistance <= nearestLocation.radius) {
      return {
        isAllowed: true,
        location: userLoc,
        nearestLocation,
        distance: Math.round(minDistance),
        message: `You are at ${nearestLocation.address}`,
      }
    }

    return {
      isAllowed: false,
      location: userLoc,
      nearestLocation,
      distance: Math.round(minDistance),
      message: `You are ${Math.round(minDistance)} meters away from allowed location. You must be within ${nearestLocation?.radius} meters.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get location'
    return {
      isAllowed: false,
      location: null,
      nearestLocation: null,
      distance: null,
      message,
    }
  }
}
