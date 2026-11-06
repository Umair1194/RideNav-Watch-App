import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createMessage, validateMessage } from '../shared/protocol.js'
import { normalizeSettings, watchSettings } from '../shared/settings.js'
import { demoRoute } from '../fixtures/demo-route.js'
function sideService() {
  let service, routeCalls = 0, usedSettings, call
  const privateSettings = normalizeSettings({ mapboxToken: 'current-phone-token', backendToken: 'private-backend', backendUrl: 'https://private.example/route' })
  const scope = { console: { log() {} }, Map, Date, createMessage, validateMessage, normalizeSettings, watchSettings, readSettings: () => privateSettings, getRoute: async (_, settings) => { routeCalls++; usedSettings = settings; return demoRoute }, getGoogleNavigationStatus: async () => ({ active: false }), BaseSideService: value => value, AppSideService: value => { service = value } }
  vm.runInNewContext(fs.readFileSync('app-side/index.js', 'utf8').replace(/^import .+\n/gm, ''), scope)
  service.call = value => { call = value }
  const request = message => new Promise((resolve, reject) => service.onRequest({ method: 'PROTOCOL', params: { message } }, (error, result) => error ? reject(error) : resolve(result)))
  return { service, request, get routeCalls() { return routeCalls }, get usedSettings() { return usedSettings }, get call() { return call } }
}
test('settings requests and live changes omit routing credentials', async () => {
  const side = sideService()
  const result = await side.request(createMessage('GET_SETTINGS'))
  assert.equal(result.message.payload.settings.mapboxToken, undefined)
  side.service.onSettingsChange({ key: 'ridenav.mapboxToken' })
  assert.equal(side.call.params.message.payload.settings.mapboxToken, undefined)
  assert.equal(side.call.params.message.payload.settings.backendToken, undefined)
})
test('retransmitted routes share a result and use the current phone credential', async () => {
  const side = sideService()
  const message = createMessage('ROUTE_REQUEST', { demo: true, settings: { mapboxToken: 'old-watch-token' } })
  const results = await Promise.all([side.request(message), side.request(message)])
  assert.equal(side.routeCalls, 1)
  assert.equal(side.usedSettings.mapboxToken, 'current-phone-token')
  assert.equal(results[0].message.requestId, results[1].message.requestId)
  assert.equal(results[0].message.payload.settings.mapboxToken, undefined)
})
