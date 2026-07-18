import { MESSAGE_TYPES, PROTOCOL_VERSION } from './constants.js'

let sequence = 0
export function requestId(prefix = 'r') { sequence = (sequence + 1) % 1000000; return `${prefix}-${Date.now().toString(36)}-${sequence}` }

export function createMessage(type, payload = {}, id = requestId()) {
  if (!MESSAGE_TYPES.includes(type)) throw new Error(`Unknown message type: ${type}`)
  return { version: PROTOCOL_VERSION, type, requestId: id, timestamp: Date.now(), payload }
}

export function validateMessage(value) {
  if (!value || typeof value !== 'object') return { valid: false, error: 'Message must be an object' }
  if (value.version !== PROTOCOL_VERSION) return { valid: false, ignored: true, error: 'Unsupported protocol version' }
  if (!MESSAGE_TYPES.includes(value.type)) return { valid: false, ignored: true, error: 'Unknown message type' }
  if (typeof value.requestId !== 'string' || !value.requestId) return { valid: false, error: 'requestId missing' }
  if (!Number.isFinite(value.timestamp) || !value.payload || typeof value.payload !== 'object') return { valid: false, error: 'Malformed message' }
  if ((value.type === 'POSITION_UPDATE' || value.type === 'REROUTE_REQUEST') &&
      (!Number.isFinite(value.payload.lat) || !Number.isFinite(value.payload.lon))) return { valid: false, error: 'Position missing' }
  return { valid: true, message: value }
}

export function encodeMessage(value) { return JSON.stringify(value) }
export function decodeMessage(text) {
  try { return validateMessage(JSON.parse(text)) } catch (_) { return { valid: false, error: 'Invalid JSON' } }
}

export class RequestTracker {
  constructor(timeoutMs = 10000) { this.timeoutMs = timeoutMs; this.pending = new Map(); this.seen = new Map() }
  add(id, now = Date.now()) { if (this.pending.has(id)) return false; this.pending.set(id, now + this.timeoutMs); return true }
  resolve(id) { const existed = this.pending.has(id); this.pending.delete(id); return existed }
  isDuplicate(id, now = Date.now()) { this.prune(now); if (this.seen.has(id)) return true; this.seen.set(id, now); return false }
  expired(now = Date.now()) { const ids = []; for (const [id, deadline] of this.pending) if (deadline <= now) { ids.push(id); this.pending.delete(id) }; return ids }
  prune(now = Date.now()) { for (const [id, time] of this.seen) if (now - time > 60000) this.seen.delete(id) }
}
