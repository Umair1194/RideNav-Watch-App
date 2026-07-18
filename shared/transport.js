import { createMessage, validateMessage } from './protocol.js'

export function requestMessage(context, type, payload = {}) {
  const outbound = createMessage(type, payload)
  return context.request({ method: 'PROTOCOL', params: { message: outbound } }).then(result => {
    const validation = validateMessage(result?.message)
    if (!validation.valid) throw new Error(validation.error || 'Invalid phone response')
    if (validation.message.requestId !== outbound.requestId) throw new Error('Mismatched phone response')
    if (validation.message.type === 'ROUTE_ERROR') throw new Error(validation.message.payload.message || 'Routing failed')
    return validation.message
  })
}

export function callMessage(context, type, payload = {}) {
  context.call({ method: 'PROTOCOL', params: { message: createMessage(type, payload) } })
}

export function incomingCall(data) {
  return validateMessage(data?.params?.message || data?.message)
}
