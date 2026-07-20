export function beginWatchSession(state) {
  state.generation = (Number(state.generation) || 0) + 1
  state.timer = null
  state.busy = false
  state.destroyed = false
  state.failures = 0
  state.hadActive = false
  state.instructionSignature = ''
  state.endArmed = false
  state.widgets = {}
  return state.generation
}

export function isCurrentWatchSession(state, generation) {
  return !state.destroyed && state.generation === generation
}

export function endWatchSession(state) {
  state.destroyed = true
  state.generation = (Number(state.generation) || 0) + 1
}
