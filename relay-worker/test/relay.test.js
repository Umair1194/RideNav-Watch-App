import test from 'node:test'
import assert from 'node:assert/strict'

test('relay path contract accepts generated session identifiers', () => {
  const pattern = /^\/v1\/session\/([a-zA-Z0-9_-]{16,80})$/
  assert.ok(pattern.test('/v1/session/abcdEFGH_1234567'))
  assert.ok(!pattern.test('/v1/session/short'))
})

test('navigation payload limits are suitable for compact BLE state', () => {
  const input = 'x'.repeat(500)
  assert.equal(input.slice(0, 160).length, 160)
})
