import { MAX_ROUTE_POINTS } from '../../shared/constants.js'
import { isCoordinate } from '../../shared/geo.js'
import { simplifyGeometry, validateRoute } from '../../shared/route-model.js'

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
  const geometry = simplifyGeometry(original, MAX_ROUTE_POINTS)
  const steps = leg.steps.map((step, index) => {
    const location = { lat: Number(step.maneuver?.location?.[1]), lon: Number(step.maneuver?.location?.[0]) }
    if (!isCoordinate(location)) throw new Error('Invalid maneuver coordinates')
    const [maneuverType, maneuverModifier] = maneuver(step)
    const mappedIndex = Math.min(geometry.length - 1, Math.round(index * (geometry.length - 1) / Math.max(1, leg.steps.length - 1)))
    return { id: `step-${index}`, index, maneuverType, maneuverModifier,
      instruction: step.maneuver?.instruction || step.name || 'Continue', shortInstruction: shortInstruction(maneuverType, maneuverModifier),
      roadName: step.name || '', distanceMeters: Number(step.distance) || 0, durationSeconds: Number(step.duration) || 0,
      location, geometryStartIndex: mappedIndex, geometryEndIndex: Math.min(geometry.length - 1, mappedIndex + 1),
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
