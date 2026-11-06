export const PROTOCOL_VERSION = 1
export const MAX_ROUTE_POINTS = 500
export const MAX_ROUTE_BYTES = 120000
export const MODES = ['car', 'bike', 'walk']
export const DEFAULT_SETTINGS = {
  destination: '', destinationLat: '', destinationLon: '', mode: 'bike', units: 'metric',
  vibration: true, earlyAlerts: true, screenDuration: '1h', provider: 'demo',
  hapticMode: 'all', hapticStrength: 'normal', displayMode: 'auto', textSize: 'standard',
  mapboxToken: '', backendUrl: '', backendToken: '', demoMode: true
}
export const THRESHOLDS = {
  car: { early: 300, prepare: 120, final: 40, offRoute: 45, stationarySpeed: 0.8 },
  bike: { early: 180, prepare: 70, final: 25, offRoute: 30, stationarySpeed: 0.5 },
  walk: { early: 80, prepare: 35, final: 12, offRoute: 20, stationarySpeed: 0.3 }
}
export const MESSAGE_TYPES = [
  'APP_READY', 'CONNECTION_STATUS', 'GET_SETTINGS', 'SETTINGS_CHANGED', 'START_NAVIGATION',
  'STOP_NAVIGATION', 'ROUTE_REQUEST', 'ROUTE_RESPONSE', 'ROUTE_ERROR', 'POSITION_UPDATE',
  'REROUTE_REQUEST', 'NAVIGATION_STATE', 'GOOGLE_NAV_STATUS', 'GOOGLE_NAV_RESPONSE', 'CLEAR_SESSION', 'PING', 'PONG'
]
