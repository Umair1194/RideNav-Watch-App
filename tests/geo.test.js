import test from 'node:test'
import assert from 'node:assert/strict'
import { angleDifference, bearing, closestPointOnSegment, haversine, normalizeAngle } from '../shared/geo.js'
import { formatDistance } from '../shared/format.js'

test('haversine and bearing are geographically sane', () => {
  const a = { lat: 0, lon: 0 }, b = { lat: 0, lon: 1 }
  assert.ok(Math.abs(haversine(a, b) - 111195) < 200)
  assert.ok(Math.abs(bearing(a, b) - 90) < 0.1)
})
test('angle normalization wraps safely', () => { assert.equal(normalizeAngle(-10), 350); assert.equal(angleDifference(350, 10), 20) })
test('closest point projects to a segment', () => {
  const result = closestPointOnSegment({lat:0.001,lon:0.005},{lat:0,lon:0},{lat:0,lon:0.01})
  assert.ok(result.fraction > 0.49 && result.fraction < 0.51); assert.ok(result.distance > 100 && result.distance < 120)
})
test('metric and imperial distances format', () => { assert.equal(formatDistance(350), '350 m'); assert.equal(formatDistance(1609.344, 'imperial'), '1.0 mi') })
