import test from 'node:test'
import assert from 'node:assert/strict'
import { beginWatchSession, endWatchSession, isCurrentWatchSession } from '../shared/watch-session.js'

test('a second watch navigation starts with clean route state', () => {
  const state = { generation: 0, destroyed: true, busy: true, failures: 4, hadActive: true, instructionSignature: 'arrive', endArmed: true, widgets: { old: true } }
  const first = beginWatchSession(state)
  state.hadActive = true
  endWatchSession(state)
  const second = beginWatchSession(state)
  assert.ok(second > first)
  assert.equal(state.destroyed, false)
  assert.equal(state.busy, false)
  assert.equal(state.failures, 0)
  assert.equal(state.hadActive, false)
  assert.equal(state.instructionSignature, '')
  assert.deepEqual(state.widgets, {})
})

test('late responses from a closed route cannot update the next route', () => {
  const state = {}
  const first = beginWatchSession(state)
  endWatchSession(state)
  const second = beginWatchSession(state)
  assert.equal(isCurrentWatchSession(state, first), false)
  assert.equal(isCurrentWatchSession(state, second), true)
})
