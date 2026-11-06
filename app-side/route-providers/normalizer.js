import { MAX_ROUTE_POINTS } from '../../shared/constants.js'
import { haversine, isCoordinate } from '../../shared/geo.js'
import { validateRoute } from '../../shared/route-model.js'

const modifierMap = { 'slight left': 'slight-left', 'sharp left': 'sharp-left', 'slight right': 'slight-right', 'sharp right': 'sharp-right', 'uturn': 'u-turn' }
const validModifiers = new Set(['straight', 'slight-left', 'left', 'sharp-left', 'slight-right', 'right', 'sharp-right', 'u-turn'])

function maneuver(step) {
  const type = String(step.maneuver?.type || 'unknown').toLowerCase()
  const rawModifier = String(step.maneuver?.modifier || '').toLowerCase()
  const modifier = modifierMap[rawModifier] || rawModifier || (type === 'continue' ? 'straight' : '')
  if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn') return ['roundabout', modifier]
  if (type === 'arrive') return ['arrive', modifier]
  if (['merge', 'fork', 'ramp', 'turn', 'continue', 'depart'].includes(type)) return [type, validModifiers.has(modifier) ? modifier : 'straight']
  return ['unknown', validModifiers.has(modifier) ? modifier : 'straight']
}

export function normalizeMapbox(json, mode = 'bike') {
  const source = json?.routes?.[0]
  const leg = source?.legs?.[0]
  if (!source || !leg || !Array.isArray(leg.steps) || !leg.steps.length) throw new Error('No route found')
  const rawGeometry = source.geometry?.coordinates
  if (!Array.isArray(rawGeometry) || rawGeometry.length < 2) throw new Error('Invalid route response')
  const original = rawGeometry.map(c => ({ lat: Number(c[1]), lon: Number(c[0]) }))
  if (original.some(p => !isCoordinate(p))) throw new Error('Invalid route coordinates')
  // Keep every maneuver vertex when reducing an oversized route. Uniform-only
  // sampling can cut corners and falsely classify the rider as off-route.
  const required = new Set([0, original.length - 1])
  let expectedDistance = 0, previousOriginal = 0
  for (const step of leg.steps) {
    const location = { lat: Number(step.maneuver?.location?.[1]), lon: Number(step.maneuver?.location?.[0]) }
    let along = 0, best = Infinity, selected = previousOriginal
    for (let i = 0; i < original.length; i += 1) {
      if (i) along += haversine(original[i - 1], original[i])
      if (i < previousOriginal) continue
      const score = haversine(location, original[i]) + Math.abs(along - expectedDistance) * 0.1
      if (score < best) { best = score; selected = i }
    }
    required.add(selected); previousOriginal = selected
    expectedDistance += Number(step.distance) || 0
  }
  if (required.size > MAX_ROUTE_POINTS) throw new Error('Route has too many maneuvers')
  const extra = MAX_ROUTE_POINTS - required.size
  for (let i = 1; i <= extra && original.length > MAX_ROUTE_POINTS; i += 1) required.add(Math.round(i * (original.length - 1) / (extra + 1)))
  const geometry = original.length <= MAX_ROUTE_POINTS ? original : [...required].sort((a, b) => a - b).map(index => original[index])
  let previousIndex = 0
  let cumulativeDistance = 0
  const steps = leg.steps.map((step, index) => {
    const location = { lat: Number(step.maneuver?.location?.[1]), lon: Number(step.maneuver?.location?.[0]) }
    if (!isCoordinate(location)) throw new Error('Invalid maneuver coordinates')
    const [maneuverType, maneuverModifier] = maneuver(step)
    // Match actual maneuver positions in route order. Distance along the provider
    // route disambiguates repeated coordinates at loops and crossings.
    let mappedIndex = previousIndex
    let best = Infinity
    let along = 0
    for (let i = 0; i < geometry.length; i += 1) {
      if (i) along += haversine(geometry[i - 1], geometry[i])
      if (i < previousIndex) continue
      const score = haversine(location, geometry[i]) + Math.abs(along - cumulativeDistance) * 0.1
      if (score < best) { best = score; mappedIndex = i }
    }
    const startIndex = previousIndex
    previousIndex = mappedIndex
    cumulativeDistance += Number(step.distance) || 0
    return { id: `step-${index}`, index, maneuverType, maneuverModifier,
      instruction: step.maneuver?.instruction || step.name || 'Continue', shortInstruction: shortInstruction(maneuverType, maneuverModifier),
      roadName: step.name || '', distanceMeters: Number(step.distance) || 0, durationSeconds: Number(step.duration) || 0,
      location, geometryStartIndex: startIndex, geometryEndIndex: mappedIndex,
      roundaboutExit: Number.isInteger(step.maneuver?.exit) ? step.maneuver.exit : null }
  })
  const route = { routeId: `mapbox-${Date.now()}`, mode, distanceMeters: Number(source.distance) || 0,
    durationSeconds: Number(source.duration) || 0, geometry, steps }
  const validation = validateRoute(route)
  if (!validation.valid) throw new Error(validation.error)
  return route
}

export function shortInstruction(type, modifier) {
  if (type === 'arrive') return 'You have arrived'
  if (type === 'roundabout') return 'Enter roundabout'
  if (type === 'merge') return `Merge ${modifier === 'left' ? 'left' : 'right'}`
  if (type === 'fork') return `Keep ${modifier === 'left' ? 'left' : 'right'}`
  const labels = { straight: 'Continue straight', left: 'Turn left', right: 'Turn right', 'slight-left': 'Slight left',
    'slight-right': 'Slight right', 'sharp-left': 'Sharp left', 'sharp-right': 'Sharp right', 'u-turn': 'Make a U-turn' }
  return labels[modifier] || 'Continue'
}
