import { RELAY_URL, RELAY_TOKEN, RELAY_SESSION } from '../../shared/relay-config.generated.js'

const BRIDGE_URL = `${RELAY_URL}/v1/session/${RELAY_SESSION}`

export async function getGoogleNavigationStatus() {
  if (!RELAY_URL || !RELAY_TOKEN || !RELAY_SESSION) throw new Error('Private relay is not configured for this build')
  let timer
  try {
    const response = await Promise.race([
      fetch({ url: BRIDGE_URL, method: 'GET', headers: { Authorization: `Bearer ${RELAY_TOKEN}` } }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('RideNav Android Bridge not reachable')), 1800) })
    ])
    if (response.status < 200 || response.status >= 300) throw new Error(`Android Bridge error (${response.status})`)
    const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
    if (!body || typeof body !== 'object') throw new Error('Invalid Android Bridge response')
    return {
      active: !!body.active,
      instruction: String(body.instruction || ''),
      distance: String(body.distance || ''),
      eta: String(body.eta || ''),
      road: String(body.road || ''),
      maneuverType: String(body.maneuverType || 'unknown'),
      maneuverModifier: String(body.maneuverModifier || 'straight'),
      roundaboutExit: Number(body.roundaboutExit) || 0,
      updatedAt: Number(body.updatedAt) || 0,
      stale: !!body.stale,
      source: 'google-maps-private-relay'
    }
  } finally { if (timer) clearTimeout(timer) }
}
