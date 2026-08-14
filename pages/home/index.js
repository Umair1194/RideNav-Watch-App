import { BasePage } from '@zeppos/zml/base-page'
import * as hmUI from '@zos/ui'
import { push } from '@zos/router'
import { clearSession, loadSession } from '../../shared/storage.js'
import { button, COLORS, setText, text } from '../../shared/ui.js'
import { incomingCall, requestMessage } from '../../shared/transport.js'

Page(BasePage({
  state: { status: null, detail: null },
  build() {
    const saved = loadSession()
    text({ x: 60, y: 42, w: 360, h: 50, text: 'RideNav', text_size: 38 })
    text({ x: 75, y: 91, w: 330, h: 31, text: 'Navigation at a glance', text_size: 18, color: COLORS.muted })
    this.state.status = text({ x: 65, y: 133, w: 350, h: 38, text: '● Checking connection…', text_size: 20, color: COLORS.amber })
    this.state.detail = text({ x: 70, y: 172, w: 340, h: 30, text: 'Phone • bridge • directions', text_size: 16, color: COLORS.muted })
    button({ x: 70, y: 220, w: 340, h: 76, text: 'Open navigation', normal_color: COLORS.green, press_color: 0x218c60, click_func: () => push({ url: 'pages/google-navigation/index' }) })
    button({ x: 100, y: 316, w: 280, h: 55, text: 'Connection details', normal_color: 0x303840, press_color: 0x202830, click_func: () => push({ url: 'pages/diagnostics/index' }) })
    button({ x: 110, y: 389, w: 260, h: 46, text: saved ? 'Resume built-in route' : 'Built-in route / demo', normal_color: 0x202830, press_color: 0x303840, click_func: () => push({ url: saved ? 'pages/navigation/index' : 'pages/setup/index', params: saved ? {} : { demo: true } }) })
    this.checkReadiness()
  },
  checkReadiness() {
    requestMessage(this, 'GOOGLE_NAV_STATUS', {}, 8000).then(({ payload }) => {
      const live = payload.active
      setText(this.state.status, live ? '● Navigation live' : payload.bridgeOnline === false ? '● Phone bridge sleeping' : '● Ready')
      this.state.status?.setProperty(hmUI.prop.COLOR, live || payload.bridgeOnline !== false ? COLORS.green : COLORS.amber)
      setText(this.state.detail, live ? `${payload.distance || ''}  ${payload.instruction || ''}` : payload.source === 'phone-local' ? 'Phone connected • local fallback' : 'Phone connected • waiting for Google Maps')
    }).catch(() => {
      setText(this.state.status, '● Connection needs attention')
      this.state.status?.setProperty(hmUI.prop.COLOR, COLORS.amber)
      setText(this.state.detail, 'Open Connection details')
    })
  },
  onCall(data) { const message = incomingCall(data); if (message.valid && message.message.type === 'CLEAR_SESSION') clearSession() }
}))
