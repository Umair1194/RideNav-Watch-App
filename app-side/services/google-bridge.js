import { RELAY_URL, RELAY_TOKEN, RELAY_SESSION } from '../../shared/relay-config.generated.js'
import { fetchBridgeWithFallback } from './bridge-failover.js'

const BRIDGE_URL = `${RELAY_URL}/v1/session/${RELAY_SESSION}`
const LOCAL_BRIDGE_URL = 'http://127.0.0.1:17463/status'

export async function fetchGoogleBridgeStatus() {
  return fetchBridgeWithFallback({ fetcher: fetch, cloudUrl: BRIDGE_URL, localUrl: LOCAL_BRIDGE_URL, token: RELAY_TOKEN })
}

export async function getGoogleNavigationStatus() {
  if (!RELAY_URL || !RELAY_TOKEN || !RELAY_SESSION) throw new Error('Private relay is not configured for this build')
  const { body, source } = await fetchGoogleBridgeStatus()
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
    bridgeOnline: body.bridgeOnline !== false,
    source
  }
}
