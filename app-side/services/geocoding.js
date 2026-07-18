import { geocodeMapbox } from '../route-providers/mapbox.js'
export async function resolveDestination(settings) {
  const lat = Number(settings.destinationLat), lon = Number(settings.destinationLon)
  if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) return { lat, lon }
  if (!settings.destination) throw new Error('Destination missing')
  if (settings.provider === 'mapbox') return geocodeMapbox(settings.destination, settings.mapboxToken)
  throw new Error('Destination coordinates required for this provider')
}
