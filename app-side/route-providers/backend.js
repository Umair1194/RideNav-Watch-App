import { phoneFetch } from '../services/network.js'
import { validateRoute } from '../../shared/route-model.js'

export async function routeBackend(origin, settings) {
  if (!/^https:\/\/[^\s/?#@]+(?:\/[^\s#]*)?$/.test(settings.backendUrl || '')) throw new Error('Configure an HTTPS routing backend URL')
  if (!settings.backendToken) throw new Error('Backend bearer token missing')
  let timer
  try {
    const response = await Promise.race([
      phoneFetch({ url: settings.backendUrl, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.backendToken}` }, body: JSON.stringify({ version: 1, origin, destination: { query: settings.destination || '', lat: settings.destinationLat === '' ? null : Number(settings.destinationLat), lon: settings.destinationLon === '' ? null : Number(settings.destinationLon) }, mode: settings.mode }) }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Routing backend timeout')), 20000) })
    ])
    if (response.status < 200 || response.status >= 300) throw new Error(response.status === 401 || response.status === 403 ? 'Backend authentication failed' : 'Routing backend unavailable')
    const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
    const result = validateRoute(body?.route)
    if (!result.valid) throw new Error(result.error)
    return body.route
  } finally { if (timer) clearTimeout(timer) }
}
