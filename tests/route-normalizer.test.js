import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMapbox } from '../app-side/route-providers/normalizer.js'

const valid = { routes:[{distance:100,duration:40,geometry:{coordinates:[[74,31],[74.001,31.001]]},legs:[{steps:[
  {distance:70,duration:30,name:'Main',maneuver:{type:'turn',modifier:'left',instruction:'Turn left',location:[74,31]}},
  {distance:30,duration:10,name:'End',maneuver:{type:'arrive',instruction:'Arrive',location:[74.001,31.001]}}
]}]}] }
test('normalizes a provider route', () => { const route=normalizeMapbox(valid,'car'); assert.equal(route.steps[0].maneuverModifier,'left'); assert.equal(route.mode,'car') })
test('preserves unknown maneuver safely and fallback instruction', () => {
  const copy=structuredClone(valid); copy.routes[0].legs[0].steps[0].maneuver.type='teleport'; delete copy.routes[0].legs[0].steps[0].maneuver.instruction
  const route=normalizeMapbox(copy); assert.equal(route.steps[0].maneuverType,'unknown'); assert.equal(route.steps[0].instruction,'Main')
})
test('roundabout exit is normalized', () => { const copy=structuredClone(valid); Object.assign(copy.routes[0].legs[0].steps[0].maneuver,{type:'roundabout',exit:2}); assert.equal(normalizeMapbox(copy).steps[0].roundaboutExit,2) })
test('empty and invalid responses fail visibly', () => { assert.throws(()=>normalizeMapbox({}),/No route/); const copy=structuredClone(valid); copy.routes[0].geometry.coordinates[0]=[999,999]; assert.throws(()=>normalizeMapbox(copy),/coordinates/) })
test('oversized geometry is reduced', () => { const copy=structuredClone(valid); copy.routes[0].geometry.coordinates=Array.from({length:900},(_,i)=>[74+i/100000,31+i/100000]); assert.ok(normalizeMapbox(copy).geometry.length <= 500) })

test('simplifying a long route preserves a sharp maneuver vertex', () => {
  const copy = structuredClone(valid)
  const points = Array.from({ length: 1200 }, (_, i) => [74 + i / 100000, 31])
  points[731] = [74.00731, 31.004]
  copy.routes[0].geometry.coordinates = points
  copy.routes[0].legs[0].steps[1].maneuver.location = points[731]
  const route = normalizeMapbox(copy)
  assert.ok(route.geometry.some(point => point.lat === 31.004 && point.lon === 74.00731))
})
