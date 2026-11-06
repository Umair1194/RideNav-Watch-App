import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function runtime() {
  const values = new Map()
  let time = 1000000
  const storage = { get: async key => values.get(key), put: async (key, value) => values.set(key, value) }
  const scope = { Request, Response, URL, Date: { now: () => time }, DurableObject: class { constructor(ctx) { this.ctx = ctx } } }
  const source = fs.readFileSync(new URL('../src/index.js', import.meta.url), 'utf8').replace(/^import .+\n/gm, '').replace('export class NavigationSession', 'class NavigationSession').replace('export default {', 'globalThis.worker = {') + '\nglobalThis.Session = NavigationSession'
  vm.runInNewContext(source, scope)
  const session = new scope.Session({ storage })
  const post = state => session.fetch(new Request('https://test/', { method: 'POST', body: JSON.stringify(state) }))
  const get = async () => (await session.fetch(new Request('https://test/'))).json()
  return { post, get, scope, advance: ms => { time += ms } }
}
const state = (publisherId, sequence, instruction = 'Turn left') => ({ publisherId, sequence, instruction, active: true })
const first = 'publisher-first-123', second = 'publisher-second-123'
test('actual relay rejects out-of-order updates and old publisher restarts', async () => {
  const relay = runtime()
  await relay.post(state(first, 100))
  await relay.post(state(first, 99, 'Wrong old turn'))
  assert.equal((await relay.get()).instruction, 'Turn left')
  await relay.post(state(second, 1, 'New route after clock rollback'))
  assert.equal((await relay.get()).instruction, 'New route after clock rollback')
  await relay.post(state(first, 101, 'Late old process'))
  assert.equal((await relay.get()).publisherId, second)
})
test('actual relay expires heartbeats and accepts fresh recovery', async () => {
  const relay = runtime()
  await relay.post(state(first, 1))
  relay.advance(120001)
  assert.equal((await relay.get()).active, false)
  assert.equal((await relay.get()).bridgeOnline, false)
  await relay.post(state(first, 2))
  assert.equal((await relay.get()).active, true)
})
test('actual relay handles invalid JSON state and missing secret', async () => {
  const relay = runtime()
  assert.equal((await relay.post(null)).status, 400)
  const response = await relay.scope.worker.fetch(new Request('https://test/v1/session/abcdefghijklmnop', { headers: { Authorization: 'Bearer undefined' } }), {})
  assert.equal(response.status, 401)
})
