import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchBridgeWithFallback } from '../app-side/services/bridge-failover.js'

const response = body => ({ status: 200, body })
const options = fetcher => ({ fetcher, cloudUrl: 'https://relay/session', localUrl: 'http://127.0.0.1/status', token: 'secret', cloudTimeout: 50, localTimeout: 50 })

test('bridge uses the cloud relay when healthy', async () => {
  const result = await fetchBridgeWithFallback(options(async request => {
    assert.equal(request.headers.Authorization, 'Bearer secret')
    return response({ active: true })
  }))
  assert.equal(result.source, 'private-relay')
  assert.equal(result.body.active, true)
})

test('bridge falls back to authenticated phone-local state', async () => {
  const calls = []
  const result = await fetchBridgeWithFallback(options(async request => {
    calls.push(request.url)
    if (request.url.startsWith('https')) throw new Error('offline')
    return response({ active: true })
  }))
  assert.deepEqual(calls, ['https://relay/session', 'http://127.0.0.1/status'])
  assert.equal(result.source, 'phone-local')
})

test('bridge retries cloud once and reports authentication separately', async () => {
  let calls = 0
  await assert.rejects(fetchBridgeWithFallback(options(async request => {
    calls += 1
    if (request.url.startsWith('http://')) throw new Error('blocked')
    return { status: 401, body: '{}' }
  })), /Relay authentication rejected/)
  assert.equal(calls, 3)
})
