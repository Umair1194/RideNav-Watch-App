import test from 'node:test'
import assert from 'node:assert/strict'
import { requestMessage } from '../shared/transport.js'

test('watch transport rejects a request that never settles', async () => {
  const context = { request: () => new Promise(() => {}) }
  await assert.rejects(requestMessage(context, 'GOOGLE_NAV_STATUS', {}, 10), /Phone connection timeout/)
})
