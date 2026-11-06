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
      if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'invalid state' }, 400)
      const previous = await this.ctx.storage.get('latest')
      const publisherId = typeof input.publisherId === 'string' && /^[a-zA-Z0-9-]{16,80}$/.test(input.publisherId) ? input.publisherId : ''
      const retired = await this.ctx.storage.get('retired') || []
      if (previous?.publisherId && !publisherId) return json({ error: 'publisher identifier required' }, 409)
      if (publisherId && retired.includes(publisherId)) return json({ ok: true, ignored: true })
      const sequence = Number.isSafeInteger(input.sequence) ? input.sequence : 0
      if (previous && publisherId === (previous.publisherId || '') && sequence && sequence <= previous.sequence) return json({ ok: true, ignored: true, updatedAt: previous.updatedAt })
      const state = {
        active: !!input.active,
        instruction: allowed(input.instruction), distance: allowed(input.distance), eta: allowed(input.eta), road: allowed(input.road),
        nextInstruction: allowed(input.nextInstruction), nextDistance: allowed(input.nextDistance),
        maneuverType: maneuverTypes.has(input.maneuverType) ? input.maneuverType : 'unknown',
        maneuverModifier: allowed(input.maneuverModifier), roundaboutExit: Number.isInteger(input.roundaboutExit) ? input.roundaboutExit : 0,
        publisherId, sequence, updatedAt: Date.now(), bridgeOnline: true
      }
      if (!state.active) { state.instruction = ''; state.distance = ''; state.eta = ''; state.road = ''; state.nextInstruction = ''; state.nextDistance = '' }
      if (previous?.publisherId && publisherId !== previous.publisherId) await this.ctx.storage.put('retired', [...retired, previous.publisherId].slice(-32))
      await this.ctx.storage.put('latest', state)
      return json({ ok: true, updatedAt: state.updatedAt })
    }
    if (request.method === 'GET') {
      const state = await this.ctx.storage.get('latest')
      if (!state) return json({ active: false, instruction: '', distance: '', eta: '', road: '', updatedAt: 0, bridgeOnline: false })
      if (Date.now() - state.updatedAt > 120000) return json({ ...state, active: false, stale: true, bridgeOnline: false })
      return json(state)
    }
    return json({ error: 'method not allowed' }, 405)
  }
}

export default {
  async fetch(request, env) {
    const auth = request.headers.get('authorization') || ''
    if (!env.RELAY_SECRET || auth !== `Bearer ${env.RELAY_SECRET}`) return json({ error: 'unauthorized' }, 401)
    const url = new URL(request.url)
    const match = url.pathname.match(/^\/v1\/session\/([a-zA-Z0-9_-]{16,80})$/)
    if (!match) return json({ error: 'not found' }, 404)
    return env.NAV_SESSIONS.getByName(match[1]).fetch(request)
  }
}
