import { normalizeMapbox } from './normalizer.js'

const TIMEOUT_MS = 12000
const profiles = { car: 'driving', bike: 'cycling', walk: 'walking' }
async function fetchJson(url, timeout = TIMEOUT_MS) {
  let timer
  try {
    const result = await Promise.race([fetch({ url, method: 'GET' }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Request timeout')), timeout) })])
    if (result.status === 429) throw new Error('Routing provider rate limit')
    if (result.status < 200 || result.status >= 300) throw new Error(`Routing provider error (${result.status})`)
    const json = typeof result.body === 'string' ? JSON.parse(result.body) : result.body
    if (!json || typeof json !== 'object') throw new Error('Invalid route response')
    return json
  } finally { if (timer) clearTimeout(timer) }
}

export async function geocodeMapbox(query, token) {
  if (!token) throw new Error('Routing token missing. Add it in the Zepp app settings or use Demo Mode.')
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=1&access_token=${encodeURIComponent(token)}`
  const json = await fetchJson(url)
  const coordinates = json.features?.[0]?.geometry?.coordinates
  if (!coordinates) throw new Error('Destination not found')
  return { lat: Number(coordinates[1]), lon: Number(coordinates[0]) }
}

export async function routeMapbox(origin, destination, mode, token) {
  if (!token) throw new Error('Routing token missing. Add it in the Zepp app settings or use Demo Mode.')
  const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profiles[mode] || profiles.bike}/${coords}?steps=true&geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`
  return normalizeMapbox(await fetchJson(url), mode)
}
