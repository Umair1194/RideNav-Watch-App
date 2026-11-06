import test from 'node:test'
import assert from 'node:assert/strict'
import { routeBackend } from '../app-side/route-providers/backend.js'
import { resolveDestination } from '../app-side/services/geocoding.js'
import { demoRoute } from '../fixtures/demo-route.js'
import { normalizeSettings, watchSettings } from '../shared/settings.js'

test('backend requires HTTPS and a configured credential', async () => {
  await assert.rejects(routeBackend({}, { backendUrl: 'http://example.com' }), /HTTPS/)
  await assert.rejects(routeBackend({}, { backendUrl: 'https://example.com/route' }), /token missing/)
})
test('backend sends only the documented routing contract and validates returned route', async () => {
  const original = globalThis.fetch
  let request
  globalThis.fetch = async value => { request = value; return { status: 200, body: { route: demoRoute } } }
  try {
    assert.equal((await routeBackend({ lat: 31, lon: 74 }, { backendUrl: 'https://example.com/route', backendToken: 'test', destination: 'Park', destinationLat: '', destinationLon: '', mode: 'bike', mapboxToken: 'must-not-send' })).routeId, demoRoute.routeId)
    assert.equal(request.headers.Authorization, 'Bearer test')
    assert.equal(JSON.parse(request.body).destination.lat, null)
    assert.ok(!request.body.includes('must-not-send'))
    globalThis.fetch = async () => ({ status: 200, body: { route: {} } })
    await assert.rejects(routeBackend({}, { backendUrl: 'https://example.com/route', backendToken: 'test' }), /Route ID missing/)
  } finally { globalThis.fetch = original }
})
test('blank coordinate settings geocode the destination instead of selecting zero-zero', async () => {
  const original = globalThis.fetch
  let url
  globalThis.fetch = async value => { url = value.url; return { status: 200, body: { features: [{ geometry: { coordinates: [74, 31] } }] } } }
  try {
    assert.deepEqual(await resolveDestination({ destinationLat: '', destinationLon: '', destination: 'Park', provider: 'mapbox', mapboxToken: 'test' }), { lat: 31, lon: 74 })
    assert.ok(url.includes('q=Park'))
    assert.deepEqual(await resolveDestination({ destinationLat: '0', destinationLon: '0' }), { lat: 0, lon: 0 })
  } finally { globalThis.fetch = original }
})
test('corrupted settings fall back to valid enums and boolean values', () => {
  const settings = normalizeSettings({ mode: {}, vibration: 'false', provider: 'invalid', destination: 'Park', textSize: 'large' })
  assert.equal(settings.mode, 'bike')
  assert.equal(settings.vibration, true)
  assert.equal(settings.provider, 'demo')
  assert.equal(settings.destination, 'Park')
  assert.equal(settings.textSize, 'large')
})

test('routing credentials stay on the phone instead of crossing to watch settings', () => {
  const settings = watchSettings({ mapboxToken: 'private-mapbox', backendToken: 'private-backend', backendUrl: 'https://private.example/route', destination: 'Park' })
  assert.equal(settings.destination, 'Park')
  assert.equal(settings.mapboxToken, undefined)
  assert.equal(settings.backendToken, undefined)
  assert.equal(settings.backendUrl, undefined)
})
