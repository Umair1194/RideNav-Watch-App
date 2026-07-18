import fs from 'node:fs'

const privatePath = 'shared/relay-config.private.json'
const outputPath = 'shared/relay-config.generated.js'
let config = { url: '', token: '', session: '' }
if (fs.existsSync(privatePath)) {
  const value = JSON.parse(fs.readFileSync(privatePath, 'utf8'))
  config = { url: String(value.url || ''), token: String(value.token || ''), session: String(value.session || '') }
}
const quote = value => JSON.stringify(value)
fs.writeFileSync(outputPath, `export const RELAY_URL = ${quote(config.url)}\nexport const RELAY_TOKEN = ${quote(config.token)}\nexport const RELAY_SESSION = ${quote(config.session)}\n`)
console.log(config.url ? 'Generated private relay build configuration.' : 'Generated unconfigured relay placeholders for public build.')
