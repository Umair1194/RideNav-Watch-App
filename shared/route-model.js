import { isCoordinate, polylineDistance } from './geo.js'
import { MODES, MAX_ROUTE_POINTS } from './constants.js'

export function validateRoute(route) {
  if (!route || typeof route.routeId !== 'string') return { valid: false, error: 'Route ID missing' }
  if (!MODES.includes(route.mode)) return { valid: false, error: 'Invalid travel mode' }
  if (!Array.isArray(route.geometry) || route.geometry.length < 2 || route.geometry.some(p => !isCoordinate(p))) return { valid: false, error: 'Invalid route geometry' }
  if (route.geometry.length > MAX_ROUTE_POINTS) return { valid: false, error: 'Route data too large' }
  if (!Array.isArray(route.steps) || !route.steps.length) return { valid: false, error: 'Route has no maneuvers' }
  return { valid: true }
}

export function simplifyGeometry(points, maxPoints = MAX_ROUTE_POINTS) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points || []
  const output = [points[0]]
  const stride = (points.length - 1) / (maxPoints - 1)
  for (let i = 1; i < maxPoints - 1; i += 1) output.push(points[Math.round(i * stride)])
  output.push(points[points.length - 1])
  return output
}

export function routeDistance(route) {
  return Number.isFinite(route.distanceMeters) ? route.distanceMeters : polylineDistance(route.geometry)
}
