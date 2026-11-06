import test from 'node:test'
import assert from 'node:assert/strict'
import route from '../fixtures/demo-route.json' with { type: 'json' }
import { NavigationEngine } from '../shared/navigation-engine.js'

const sample = (lat,lon,time,speed=4) => ({lat,lon,timestamp:time,accuracy:5,speed})
test('approach produces alerts without duplicates', () => {
  const e=new NavigationEngine(route); let r=e.update(sample(31.5210,74.3587,1000)); assert.ok(r.events.some(x=>x.level==='early'))
  r=e.update(sample(31.52105,74.3587,2000)); assert.equal(r.events.filter(x=>x.level==='early').length,0)
})
test('one noisy point does not reroute; three do', () => {
  const e=new NavigationEngine(route); e.update(sample(31.5204,74.3587,100000));
  assert.equal(e.update(sample(31.5204,74.3595,101000)).shouldReroute,false)
  assert.equal(e.update(sample(31.5204,74.3595,102000)).shouldReroute,false)
  assert.equal(e.update(sample(31.5204,74.3595,103000)).shouldReroute,true)
})
test('return to route clears off-route state and cooldown suppresses repeated reroute', () => {
  const e=new NavigationEngine(route); [0,1,2].forEach(i=>e.update(sample(31.5204,74.3595,100000+i*1000)))
  assert.equal(e.update(sample(31.5205,74.3587,104000)).offRoute,false)
  ;[0,1,2].forEach(i=>e.update(sample(31.5204,74.3595,105000+i*1000)))
  assert.equal(e.update(sample(31.5204,74.3595,108000)).shouldReroute,false)
})
test('rejects poor accuracy and exposes mode thresholds', () => {
  const e=new NavigationEngine(route,{mode:'walk'}); assert.equal(e.thresholds.final,12); assert.equal(e.update({lat:31,lon:74,accuracy:200}).accepted,false)
  assert.equal(new NavigationEngine(route,{mode:'car'}).thresholds.offRoute,45)
})
test('progress requires consecutive passed samples', () => {
  const e=new NavigationEngine(route); e.update(sample(31.5222,74.3587,1000)); assert.equal(e.stepIndex,0)
  e.update(sample(31.5222,74.35872,2000)); assert.equal(e.stepIndex,1)
})

test('old GPS samples do not move a recovered session backwards', () => {
  const engine = new NavigationEngine(route)
  engine.update(sample(31.5204, 74.3587, 100000))
  assert.equal(engine.update(sample(31.521, 74.3587, 99000)).reason, 'old-position')
})
test('a long GPS gap resets stale smoothing when recovering a saved route', () => {
  const engine = new NavigationEngine(route, { lastPosition: { lat: 30, lon: 73, timestamp: 1000 } })
  const result = engine.update(sample(31.5204, 74.3587, 200000))
  assert.equal(result.position.lat, 31.5204)
  assert.equal(result.position.lon, 74.3587)
})
