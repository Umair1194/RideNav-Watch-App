import { DurableObject } from 'cloudflare:workers'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
const allowed = value => typeof value === 'string' ? value.slice(0, 160) : ''
const maneuverTypes = new Set(['continue', 'turn', 'roundabout', 'merge', 'fork', 'ramp', 'arrive', 'unknown'])

export class NavigationSession extends DurableObject {
  async fetch(request) {
    if (request.method === 'POST') {
      let input
      try { input = await request.json() } catch (_) { return json({ error: 'invalid JSON' }, 400) }
      const previous = await this.ctx.storage.get('latest')
      const sequence = Number.isSafeInteger(input.sequence) ? input.sequence : 0
      if (previous && sequence && sequence <= previous.sequence) return json({ ok: true, ignored: true, updatedAt: previous.updatedAt })
      const state = {
        active: !!input.active,
        instruction: allowed(input.instruction), distance: allowed(input.distance), eta: allowed(input.eta), road: allowed(input.road),
        maneuverType: maneuverTypes.has(input.maneuverType) ? input.maneuverType : 'unknown',
        maneuverModifier: allowed(input.maneuverModifier), roundaboutExit: Number.isInteger(input.roundaboutExit) ? input.roundaboutExit : 0,
        sequence, updatedAt: Date.now()
      }
      if (!state.active) { state.instruction = ''; state.distance = ''; state.eta = ''; state.road = '' }
      await this.ctx.storage.put('latest', state)
      return json({ ok: true, updatedAt: state.updatedAt })
    }
    if (request.method === 'GET') {
      const state = await this.ctx.storage.get('latest')
      if (!state) return json({ active: false, instruction: '', distance: '', eta: '', road: '', updatedAt: 0 })
      if (Date.now() - state.updatedAt > 120000) return json({ ...state, active: false, stale: true })
      return json(state)
    }
    return json({ error: 'method not allowed' }, 405)
  }
}

export default {
  async fetch(request, env) {
    const auth = request.headers.get('authorization') || ''
    if (auth !== `Bearer ${env.RELAY_SECRET}`) return json({ error: 'unauthorized' }, 401)
    const url = new URL(request.url)
    const match = url.pathname.match(/^\/v1\/session\/([a-zA-Z0-9_-]{16,80})$/)
    if (!match) return json({ error: 'not found' }, 404)
    return env.NAV_SESSIONS.getByName(match[1]).fetch(request)
  }
}
