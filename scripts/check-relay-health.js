import fs from 'node:fs'

const configPath = new URL('../shared/relay-config.private.json', import.meta.url)
if (!fs.existsSync(configPath)) {
  console.error('Private relay configuration is missing. Run the local relay setup first.')
  process.exit(1)
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const response = await fetch(`${config.url}/v1/session/${config.session}`, {
  headers: { Authorization: `Bearer ${config.token}` }
})
if (!response.ok) {
  console.error(`Relay health check failed with HTTP ${response.status}.`)
  process.exit(1)
}

const state = await response.json()
const ageSeconds = state.updatedAt ? Math.max(0, Math.round((Date.now() - state.updatedAt) / 1000)) : Infinity
console.log('Relay reachable: yes')
console.log(`Android bridge online: ${state.bridgeOnline === true ? 'yes' : 'no'}`)
console.log(`Last bridge heartbeat: ${Number.isFinite(ageSeconds) ? `${ageSeconds}s ago` : 'never'}`)
console.log(`Navigation active: ${state.active === true ? 'yes' : 'no'}`)
if (state.bridgeOnline !== true || ageSeconds > 120) process.exitCode = 2
