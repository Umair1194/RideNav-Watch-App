import { createMessage, validateMessage } from './protocol.js'

export function requestMessage(context, type, payload = {}, timeoutMs = type === 'ROUTE_REQUEST' || type === 'REROUTE_REQUEST' ? 30000 : 10000) {
  const outbound = createMessage(type, payload)
  let timer
  // ZML otherwise keeps a lost BLE request alive for its 60-second default.
  // Passing the native timeout releases the underlying handler as well as our UI watchdog.
  const request = Promise.resolve().then(() => context.request({ method: 'PROTOCOL', params: { message: outbound } }, { timeout: timeoutMs })).catch(() => { throw new Error('Phone connection interrupted') })
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Phone connection timeout')), timeoutMs)
  })
  return Promise.race([request, timeout]).then(result => {
    const validation = validateMessage(result?.message)
    if (!validation.valid) throw new Error(validation.error || 'Invalid phone response')
    if (validation.message.requestId !== outbound.requestId) throw new Error('Mismatched phone response')
    if (validation.message.type === 'ROUTE_ERROR') throw new Error(validation.message.payload.message || 'Routing failed')
    const expected = { GET_SETTINGS: 'SETTINGS_CHANGED', GOOGLE_NAV_STATUS: 'GOOGLE_NAV_RESPONSE', ROUTE_REQUEST: 'ROUTE_RESPONSE', REROUTE_REQUEST: 'ROUTE_RESPONSE' }[type]
    if (expected && validation.message.type !== expected) throw new Error('Unexpected phone response')
    return validation.message
  }).finally(() => { if (timer) clearTimeout(timer) })
}

export function callMessage(context, type, payload = {}) {
  context.call({ method: 'PROTOCOL', params: { message: createMessage(type, payload) } })
}

export function incomingCall(data) {
  return validateMessage(data?.params?.message || data?.message)
}
