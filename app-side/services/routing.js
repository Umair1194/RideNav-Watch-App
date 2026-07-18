import { getDemoRoute, routeMapbox } from '../route-providers/index.js'
import { resolveDestination } from './geocoding.js'
import { validateRoute } from '../../shared/route-model.js'
import { MAX_ROUTE_BYTES } from '../../shared/constants.js'

export async function getRoute(origin, settings, forceDemo = false) {
  let route
  if (forceDemo || settings.demoMode || settings.provider === 'demo') route = await getDemoRoute(settings.mode)
  else {
    if (!origin || !Number.isFinite(origin.lat) || !Number.isFinite(origin.lon)) throw new Error('Waiting for a valid GPS position')
    const destination = await resolveDestination(settings)
    if (settings.provider === 'mapbox') route = await routeMapbox(origin, destination, settings.mode, settings.mapboxToken)
    else if (settings.provider === 'backend') throw new Error('Production backend provider is not configured yet')
    else throw new Error('Unsupported routing provider')
  }
  const validation = validateRoute(route)
  if (!validation.valid) throw new Error(validation.error)
  if (JSON.stringify(route).length > MAX_ROUTE_BYTES) throw new Error('Route data too large')
  return route
}
