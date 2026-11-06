import test from 'node:test'
import assert from 'node:assert/strict'
import { createBoundedFetch } from '../shared/bounded-fetch.js'
import { fetchBridgeWithFallback } from '../app-side/services/bridge-failover.js'
import { normalizeMapbox } from '../app-side/route-providers/normalizer.js'

const opts = fetcher => ({ fetcher, cloudUrl: 'https://relay/session', localUrl: 'http://127.0.0.1/status', token: 'test', cloudTimeout: 20, localTimeout: 20 })
test('stale cloud state falls back to live phone-local directions', async () => {
  const result = await fetchBridgeWithFallback(opts(async ({ url }) => ({ status: 200, body: url.startsWith('https:') ? { active: false, stale: true, bridgeOnline: false } : { active: true, instruction: 'Turn left' } })))
  assert.equal(result.source, 'phone-local')
  assert.equal(result.body.active, true)
})
test('relay outages are not misreported as authentication failures', async () => {
  await assert.rejects(fetchBridgeWithFallback(opts(async () => ({ status: 503 }))), /service unavailable/)
})
test('malformed successful bridge responses fail visibly', async () => {
  await assert.rejects(fetchBridgeWithFallback(opts(async () => ({ status: 200, body: [] }))), /connection timeout/)
})
test('native fetch calls remain bounded after callers abandon requests', async () => {
  let finish
  const limited = createBoundedFetch(() => new Promise(resolve => { finish = resolve }), 1)
  const first = limited({})
  await Promise.resolve()
  await assert.rejects(limited({}), /network busy/)
  finish('done')
  assert.equal(await first, 'done')
  const second = limited({})
  await Promise.resolve()
  finish('recovered')
  assert.equal(await second, 'recovered')
})
test('uneven route legs use actual maneuver geometry instead of step-count fractions', () => {
  const coordinates = Array.from({ length: 11 }, (_, i) => [74 + i * 0.001, 31])
  const route = normalizeMapbox({ routes: [{ distance: 1000, geometry: { coordinates }, legs: [{ steps: [
    { distance: 800, maneuver: { type: 'depart', location: coordinates[0] } },
    { distance: 200, maneuver: { type: 'turn', modifier: 'left', location: coordinates[8] } },
    { distance: 0, maneuver: { type: 'arrive', location: coordinates[10] } }
  ] }] }] })
  assert.equal(route.steps[1].geometryStartIndex, 0)
  assert.equal(route.steps[1].geometryEndIndex, 8)
  assert.equal(route.steps[2].geometryStartIndex, 8)
  assert.equal(route.steps[2].geometryEndIndex, 10)
})
