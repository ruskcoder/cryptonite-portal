// Google Apps Script API for event checking
export const GOOGLE_SCRIPT_API = 'https://script.google.com/macros/s/AKfycbx_amL9dgOsRLuZtvhcrp1HavEkyPYKL11y1rUHPhR4A87LSvse19PPogbcLLpWgEqN/exec'

// Allowed event titles for clock in/out
export const ALLOWED_EVENT_TITLES = ['RSC Activities', 'RSC Activities']

// Allowed locations for clock in/out
// Address, latitude, longitude, and radius in meters
export const ALLOWED_LOCATIONS = [
  {
    address: '1730 Katyland Dr, Katy, TX 77493',
    lat: 29.796067947796566,
    lng: -95.81033897344692,
    radius: 100000, 
  },
]

