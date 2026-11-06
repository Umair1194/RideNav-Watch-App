import fs from 'node:fs'
import { watchPage } from '../tests/helpers/watch-page.js'
import { demoRoute } from '../fixtures/demo-route.js'
import { DEFAULT_SETTINGS } from '../shared/constants.js'
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const color = value => `#${Number(value ?? 0xffffff).toString(16).padStart(6, '0')}`
let content = ''
const names = ['home', 'google-navigation', 'navigation', 'diagnostics', 'setup', 'summary', 'error']
for (let i = 0; i < names.length; i++) {
  const name = names[i]
  const { page, widgets } = watchPage(name, { loadSession: () => name === 'navigation' ? { version: 1, active: true, route: demoRoute, mode: 'bike', settings: DEFAULT_SETTINGS, sessionStart: Date.now() } : null, Geolocation: class { onChange() {} start() {} stop() {} offChange() {} } })
  page.onInit?.('{}'); page.build()
  if (name === 'google-navigation') page.renderGuidance({ active: true, instruction: 'Turn right onto Garden Road', distance: '250 m', road: 'Garden Road', nextInstruction: 'Then turn left in 600 m', eta: '12:45 PM', updatedAt: Date.now() }, { mode: 'live' })
  const x = (i % 3) * 520 + 20, y = Math.floor(i / 3) * 540 + 50
  content += `<g transform="translate(${x},${y})"><text x="240" y="-16" fill="white" font-size="22" text-anchor="middle">${escape(name)}</text><clipPath id="face${i}"><circle cx="240" cy="240" r="240"/></clipPath><circle cx="240" cy="240" r="242" fill="#000" stroke="#555" stroke-width="3"/><g clip-path="url(#face${i})">`
  for (const w of widgets) {
    if (w.normal_color !== undefined) content += `<rect x="${w.x}" y="${w.y}" width="${w.w}" height="${w.h}" rx="${w.radius || 28}" fill="${color(w.normal_color)}"/>`
    if (w.src) {
      const png = fs.readFileSync(`assets/balance/${w.src}`).toString('base64')
      content += `<image x="${w.x}" y="${w.y}" width="${w.w}" height="${w.h}" href="data:image/png;base64,${png}"/>`
    }
    if (w.text) {
      const size = w.text_size || 23, max = Math.max(8, Math.floor(w.w / (size * 0.53)))
      const lines = []
      for (const paragraph of String(w.text).split('\n')) {
        if (!w.text_style) { lines.push(paragraph); continue }
        let line = ''
        for (const word of paragraph.split(' ')) { if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word } else line = (line + ' ' + word).trim() }
        lines.push(line)
      }
      const allowed = lines.slice(0, Math.max(1, Math.floor(w.h / (size * 1.1))))
      content += `<svg x="${w.x}" y="${w.y}" width="${w.w}" height="${w.h}"><text x="${w.w / 2}" y="${w.normal_color !== undefined ? (w.h + size * 0.7) / 2 : size}" text-anchor="middle" font-size="${size}" fill="${color(w.color)}">${allowed.map((line, j) => `<tspan x="${w.w / 2}" dy="${j ? size * 1.15 : 0}">${escape(line)}</tspan>`).join('')}</text></svg>`
    }
  }
  content += '</g></g>'; page.onDestroy?.()
}
fs.mkdirSync('tmp/layout', { recursive: true })
fs.writeFileSync('tmp/layout/watch-layout.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1580" height="1660" style="font-family:Arial,sans-serif"><rect width="100%" height="100%" fill="#15191f"/>${content}<text x="790" y="1640" text-anchor="middle" fill="#aaa" font-size="18">Source layout preview — approximate fonts and wrapping; not a device screenshot.</text></svg>`)
console.log('Wrote tmp/layout/watch-layout.svg')
