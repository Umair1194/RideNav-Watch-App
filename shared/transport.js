import { createMessage, validateMessage } from './protocol.js'

export function requestMessage(context, type, payload = {}, timeoutMs = 8000) {
  const outbound = createMessage(type, payload)
  let timer
  const request = context.request({ method: 'PROTOCOL', params: { message: outbound } })
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Phone connection timeout')), timeoutMs)
  })
  return Promise.race([request, timeout]).then(result => {
    const validation = validateMessage(result?.message)
    if (!validation.valid) throw new Error(validation.error || 'Invalid phone response')
    if (validation.message.requestId !== outbound.requestId) throw new Error('Mismatched phone response')
    if (validation.message.type === 'ROUTE_ERROR') throw new Error(validation.message.payload.message || 'Routing failed')
    return validation.message
  }).finally(() => { if (timer) clearTimeout(timer) })
}

export function callMessage(context, type, payload = {}) {
  context.call({ method: 'PROTOCOL', params: { message: createMessage(type, payload) } })
}

export function incomingCall(data) {
  return validateMessage(data?.params?.message || data?.message)
}
