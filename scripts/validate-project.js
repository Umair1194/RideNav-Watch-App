import fs from 'node:fs'

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))
const errors = []
if (app.configVersion !== 'v3') errors.push('configVersion must be v3')
if (app.runtime?.apiVersion?.target !== '3.7') errors.push('target API must be 3.7')
if (!app.permissions.includes('device:os.geolocation')) errors.push('geolocation permission missing')
if (app.permissions.includes('device:os.bg_service')) errors.push('background service permission is not allowed')
const target = app.targets?.balance
if (!target || target.designWidth !== 480) errors.push('Balance 480 target missing')
const sources = target?.platforms?.map(x => x.deviceSource).sort() || []
if (JSON.stringify(sources) !== JSON.stringify([8519936,8519937,8519939])) errors.push('Balance device sources incorrect')
for (const page of target?.module?.page?.pages || []) if (!fs.existsSync(`${page}.js`)) errors.push(`Missing page: ${page}.js`)
for (const asset of ['straight','slight-left','left','sharp-left','slight-right','right','sharp-right','u-turn-left','u-turn-right','roundabout','merge-left','merge-right','fork-left','fork-right','ramp-left','ramp-right','arrive','unknown']) if (!fs.existsSync(`assets/balance/arrows/${asset}.png`)) errors.push(`Missing arrow: ${asset}`)
const sourceFiles = fs.readdirSync('pages', { recursive: true }).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(`pages/${x}`, 'utf8')).join('\n')
if (/getEnabled\s*\(/.test(sourceFiles)) errors.push('API level 4.0 Geolocation.getEnabled used')
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log('Project configuration, target, pages, permissions and assets validated.')
