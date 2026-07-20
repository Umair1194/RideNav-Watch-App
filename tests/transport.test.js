import test from 'node:test'
import assert from 'node:assert/strict'
import { requestMessage } from '../shared/transport.js'

test('watch transport rejects a request that never settles', async () => {
  let nativeTimeout
  const context = { request: (_, options) => { nativeTimeout = options.timeout; return new Promise(() => {}) } }
  await assert.rejects(requestMessage(context, 'GOOGLE_NAV_STATUS', {}, 10), /Phone connection timeout/)
  assert.equal(nativeTimeout, 10)
})
