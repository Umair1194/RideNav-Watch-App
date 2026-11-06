const ARRIVAL_MS = 30000
const GRACE_MS = 10000

const isArrival = payload => payload?.maneuverType === 'arrive' || /\b(?:you have arrived|you've arrived|arrived at|destination reached)\b/i.test(String(payload?.instruction || ''))

export class GoogleNavSession {
  constructor() { this.reset() }

  reset() {
    this.lastPayload = null
    this.lastLiveAt = 0
    this.arrivedAt = 0
    this.hadActive = false
  }

  success(payload, now = Date.now()) {
    if (payload.stale || payload.bridgeOnline === false || (payload.updatedAt && now - payload.updatedAt > 120000)) {
      this.reset()
      return { mode: 'bridge-sleeping', payload: null }
    }
    if (payload.active) {
      this.hadActive = true
      this.lastPayload = payload
      this.lastLiveAt = now
      if (isArrival(payload)) {
        if (!this.arrivedAt) this.arrivedAt = now
        return { mode: 'arrived', payload, arrivedFor: now - this.arrivedAt }
      }
      this.arrivedAt = 0
      return { mode: 'live', payload, ageSeconds: payload.updatedAt ? Math.max(0, Math.round((now - payload.updatedAt) / 1000)) : 0 }
    }
    if (this.arrivedAt && now - this.arrivedAt < ARRIVAL_MS) return { mode: 'arrived', payload: this.lastPayload, arrivedFor: now - this.arrivedAt }
    this.lastPayload = null
    this.hadActive = false
    this.arrivedAt = 0
    return { mode: payload.bridgeOnline === false ? 'bridge-sleeping' : 'waiting', payload }
  }

  failure(error, now = Date.now()) {
    const message = String(error?.message || '')
    if (this.lastPayload?.active && now - this.lastLiveAt <= GRACE_MS) {
      return { mode: 'grace', payload: this.lastPayload, staleFor: now - this.lastLiveAt, error: message }
    }
    return { mode: message.includes('authentication') ? 'authentication' : 'reconnecting', payload: null, error: message }
  }
}

export function distanceToMeters(value) {
  const match = String(value || '').trim().toLowerCase().match(/([0-9]+(?:[.,][0-9]+)?)\s*(km|m|mi|ft)\b/)
  if (!match) return Infinity
  const amount = Number(match[1].replace(',', '.'))
  return match[2] === 'km' ? amount * 1000 : match[2] === 'mi' ? amount * 1609.344 : match[2] === 'ft' ? amount / 3.28084 : amount
}
