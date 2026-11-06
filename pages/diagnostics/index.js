import { BasePage } from '@zeppos/zml/base-page'
import * as hmUI from '@zos/ui'
import { back } from '@zos/router'
import { button, COLORS, setText, text } from '../../shared/ui.js'
import { beginWatchSession, endWatchSession, isCurrentWatchSession } from '../../shared/watch-session.js'
import { requestMessage } from '../../shared/transport.js'

Page(BasePage({
  state: { rows: {} },
  build() {
    beginWatchSession(this.state)
    text({ x: 65, y: 48, w: 350, h: 45, text: 'Connection details', text_size: 30 })
    text({ x: 70, y: 80, w: 340, h: 27, text: 'RideNav watch 1.4.0', text_size: 16, color: COLORS.muted })
    this.state.rows.phone = text({ x: 65, y: 125, w: 350, h: 42, text: '… Watch ↔ phone', text_size: 19 })
    this.state.rows.bridge = text({ x: 65, y: 177, w: 350, h: 42, text: '… Android Bridge', text_size: 19 })
    this.state.rows.path = text({ x: 65, y: 229, w: 350, h: 42, text: '… Direction path', text_size: 19 })
    this.state.rows.update = text({ x: 65, y: 281, w: 350, h: 55, text: '… Last update', text_size: 19 })
    button({ x: 70, y: 365, w: 160, h: 55, text: 'Retry', click_func: () => this.check() })
    button({ x: 250, y: 365, w: 160, h: 55, text: 'Back', normal_color: 0x303840, click_func: () => back() })
    this.check()
  },
  row(name, ready, label) {
    setText(this.state.rows[name], `${ready ? '✓' : '!'}  ${label}`)
    this.state.rows[name]?.setProperty(hmUI.prop.COLOR, ready ? COLORS.green : COLORS.amber)
  },
  onDestroy() { endWatchSession(this.state) },
  check() {
    if (this.state.busy) return
    this.state.busy = true
    const generation = this.state.generation
    Object.values(this.state.rows).forEach(row => row?.setProperty(hmUI.prop.COLOR, COLORS.muted))
    requestMessage(this, 'GOOGLE_NAV_STATUS', {}, 12000).then(({ payload }) => {
      if (!isCurrentWatchSession(this.state, generation)) return
      this.row('phone', true, 'Watch ↔ phone connected')
      this.row('bridge', payload.bridgeOnline !== false, payload.bridgeOnline === false ? 'Android Bridge sleeping' : 'Android Bridge online')
      this.row('path', true, payload.source === 'phone-local' ? 'Phone-local fallback' : 'Private cloud relay')
      const age = payload.updatedAt ? Math.max(0, Math.round((Date.now() - payload.updatedAt) / 1000)) : Infinity
      this.row('update', !payload.stale && payload.bridgeOnline !== false && age <= 120, !Number.isFinite(age) ? 'No heartbeat received' : payload.active && !payload.stale && payload.bridgeOnline !== false ? `Direction • ${age}s old` : `Heartbeat • ${age}s old`)
    }).catch(error => {
      if (!isCurrentWatchSession(this.state, generation)) return
      const message = String(error?.message || '')
      this.row('phone', !message.includes('Phone connection'), message.includes('Phone connection') ? 'Watch ↔ phone interrupted' : 'Watch ↔ phone connected')
      this.row('bridge', false, 'Android Bridge not confirmed')
      this.row('path', false, message.includes('authentication') ? 'Relay authentication error' : 'Cloud and local paths unavailable')
      this.row('update', false, 'No recent direction data')
    }).finally(() => { if (isCurrentWatchSession(this.state, generation)) this.state.busy = false })
  }
}))
