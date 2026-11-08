import test from 'node:test'
import assert from 'node:assert/strict'
import { requestMessage } from '../shared/transport.js'

test('watch transport rejects a request that never settles', async () => {
  let nativeTimeout
  const context = { request: (_, options) => { nativeTimeout = options.timeout; return new Promise(() => {}) } }
  await assert.rejects(requestMessage(context, 'GOOGLE_NAV_STATUS', {}, 10), /Phone connection timeout/)
  assert.equal(nativeTimeout, 10)
})

test('watch transport converts synchronous BLE failures into a rejected promise', async () => {
  await assert.rejects(requestMessage({ request() { throw new Error('BLE unavailable') } }, 'GET_SETTINGS'), /Phone connection interrupted/)
})

test('watch transport uses platform timers and clears a zero-valued timer handle', async () => {
  let fire, cleared
  const context = { watchTimers: { setTimeout(callback) { fire = callback; return 0 }, clearTimeout(handle) { cleared = handle } }, request: () => new Promise(() => {}) }
  const result = requestMessage(context, 'GET_SETTINGS')
  fire()
  await assert.rejects(result, /Phone connection timeout/)
  assert.equal(cleared, 0)
})
