import test from 'node:test'
import assert from 'node:assert/strict'
import { createMessage, decodeMessage, encodeMessage, RequestTracker, validateMessage } from '../shared/protocol.js'

test('protocol round trip', () => { const m=createMessage('PING',{x:1},'a'); assert.deepEqual(decodeMessage(encodeMessage(m)).message,m) })
test('unknown type and version are ignored', () => {
  assert.equal(validateMessage({version:1,type:'NOPE',requestId:'x',timestamp:1,payload:{}}).ignored,true)
  assert.equal(validateMessage({version:2,type:'PING',requestId:'x',timestamp:1,payload:{}}).ignored,true)
})
test('payload validation and invalid JSON', () => {
  const bad=createMessage('POSITION_UPDATE',{},'x'); assert.equal(validateMessage(bad).valid,false); assert.equal(decodeMessage('{').valid,false)
})
test('duplicates and timeout', () => {
  const tracker=new RequestTracker(10); assert.equal(tracker.isDuplicate('x',0),false); assert.equal(tracker.isDuplicate('x',1),true)
  tracker.add('r',0); assert.deepEqual(tracker.expired(11),['r'])
})
