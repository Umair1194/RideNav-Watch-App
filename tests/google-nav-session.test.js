import test from 'node:test'
import assert from 'node:assert/strict'
import { distanceToMeters, GoogleNavSession } from '../shared/google-nav-session.js'

const live = { active: true, instruction: 'Turn right', distance: '80 m', maneuverType: 'turn', bridgeOnline: true, updatedAt: 1000 }

test('navigation transitions through live, grace, reconnecting and recovery', () => {
  const session = new GoogleNavSession()
  assert.equal(session.success({ active: false, bridgeOnline: true }, 1000).mode, 'waiting')
  assert.equal(session.success(live, 2000).mode, 'live')
  assert.equal(session.failure(new Error('timeout'), 7000).mode, 'grace')
  assert.equal(session.failure(new Error('timeout'), 13001).mode, 'reconnecting')
  assert.equal(session.success({ ...live, instruction: 'Turn left' }, 14000).mode, 'live')
})

test('arrival becomes waiting and accepts a consecutive route', () => {
  const session = new GoogleNavSession()
  session.success(live, 1000)
  assert.equal(session.success({ ...live, maneuverType: 'arrive', instruction: 'You have arrived' }, 2000).mode, 'arrived')
  assert.equal(session.success({ active: false, bridgeOnline: true }, 20000).mode, 'arrived')
  assert.equal(session.success({ active: false, bridgeOnline: true }, 33000).mode, 'waiting')
  assert.equal(session.success({ ...live, instruction: 'Continue north' }, 34000).mode, 'live')
})

test('distance parsing supports Google Maps units', () => {
  assert.equal(distanceToMeters('250 m'), 250)
  assert.equal(distanceToMeters('1.5 km'), 1500)
  assert.ok(Math.abs(distanceToMeters('0.5 mi') - 804.672) < 0.001)
  assert.ok(Math.abs(distanceToMeters('100 ft') - 30.48) < 0.01)
})
