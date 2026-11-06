import test from 'node:test'
import assert from 'node:assert/strict'
import { watchPage, settle } from './helpers/watch-page.js'
import { demoRoute } from '../fixtures/demo-route.js'
import { DEFAULT_SETTINGS } from '../shared/constants.js'

test('offline demo starts without a route request to the phone', async () => {
  let calls = 0, session
  const { page, navigation } = watchPage('setup', { requestMessage: () => { calls++; return new Promise(() => {}) }, saveSession: value => { session = value; return true } })
  page.onInit('{"demo":true}'); page.build(); await page.startNavigation()
  assert.equal(calls, 1) // Settings only, never routing.
  assert.equal(session.route.routeId, demoRoute.routeId)
  assert.equal(navigation[0].url, 'pages/navigation/index')
})
test('closed setup ignores a late route response', async () => {
  let resolveRoute
  const { page, navigation } = watchPage('setup', { requestMessage: (_, type) => type === 'GET_SETTINGS' ? Promise.resolve({ payload: { settings: { ...DEFAULT_SETTINGS, demoMode: false, provider: 'mapbox', destination: 'Park' } } }) : new Promise(resolve => { resolveRoute = resolve }) })
  page.onInit('{}'); page.build(); await settle()
  page.state.position = { lat: 31, lon: 74, timestamp: Date.now() }
  const start = page.startNavigation(); page.onDestroy()
  resolveRoute({ payload: { route: demoRoute, settings: DEFAULT_SETTINGS } }); await start
  assert.equal(navigation.length, 0)
})
test('home ignores late phone data after it closes and does not restart polling', async () => {
  let resolve
  const { page, timers, widgets } = watchPage('home', { requestMessage: () => new Promise(done => { resolve = done }) })
  page.build(); page.onDestroy(); resolve({ payload: { active: true } }); await settle()
  assert.equal(timers.length, 0)
  assert.equal(widgets.find(w => String(w.text).includes('Checking')).text, '● Checking connection…')
})
test('closing navigation before settings failure does not restore display overrides', async () => {
  let reject, displayCalls = 0
  const { page } = watchPage('google-navigation', { requestMessage: (_, type) => type === 'GET_SETTINGS' ? new Promise((_, fail) => { reject = fail }) : new Promise(() => {}), setPageBrightTime: () => displayCalls++ })
  page.build(); const callsBeforeClose = displayCalls; page.onDestroy(); reject(new Error('disconnected')); await settle()
  assert.equal(displayCalls, callsBeforeClose)
})
test('every watch page parses and builds with the platform contract mocked', () => {
  for (const name of ['home', 'setup', 'diagnostics', 'google-navigation', 'error', 'summary']) {
    const { page, widgets } = watchPage(name)
    page.onInit?.('{}'); page.build(); assert.ok(widgets.length > 0, name); page.onDestroy?.()
  }
})

test('arrival clears the route without a later GPS callback saving it as active', () => {
  let saves = 0, clears = 0
  class GPS { onChange(callback) { this.callback = callback } offChange() {} start() {} stop() {} getStatus() { return 'A' } getLatitude() { return 31 } getLongitude() { return 74 } }
  const { page } = watchPage('navigation', { Geolocation: GPS, loadSession: () => ({ version: 1, active: true, route: demoRoute, mode: 'bike', settings: DEFAULT_SETTINGS, sessionStart: Date.now() }), saveSession: () => { saves++; return true }, clearSession: () => clears++ })
  page.onInit(); page.build(); page.render = () => {}
  page.state.engine.update = () => ({ accepted: true, events: [{ type: 'arrival' }], stepIndex: 0, stationary: false, distanceToManeuver: 0 })
  page.state.gps.callback()
  assert.equal(clears, 1)
  assert.equal(saves, 1)
  assert.equal(page.state.destroyed, true)
})

test('manual reroute requests a new route even when GPS remains on route', () => {
  let reroutes = 0
  class GPS { onChange(callback) { this.callback = callback } offChange() {} start() {} stop() {} getStatus() { return 'A' } getLatitude() { return 31 } getLongitude() { return 74 } }
  const { page, widgets } = watchPage('navigation', { Geolocation: GPS, loadSession: () => ({ version: 1, active: true, route: demoRoute, mode: 'bike', settings: DEFAULT_SETTINGS, sessionStart: Date.now() }), requestMessage: () => { reroutes++; return new Promise(() => {}) } })
  page.onInit(); page.build(); page.render = () => {}; page.toggleControls()
  widgets.find(w => w.text === 'Reroute').click_func()
  page.state.engine.update = () => ({ accepted: true, events: [], stepIndex: 0, stationary: false, distanceToManeuver: 100 })
  page.state.gps.callback()
  assert.equal(reroutes, 1)
  page.onDestroy()
})
