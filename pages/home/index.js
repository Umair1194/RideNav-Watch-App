import { BasePage } from '@zeppos/zml/base-page'
import { push } from '@zos/router'
import { clearSession, loadSession } from '../../shared/storage.js'
import { button, COLORS, text } from '../../shared/ui.js'
import { incomingCall } from '../../shared/transport.js'

Page(BasePage({
  build() {
    const saved = loadSession()
    text({ x: 60, y: 54, w: 360, h: 58, text: 'RideNav Balance', text_size: 36 })
    text({ x: 75, y: 112, w: 330, h: 42, text: 'Navigation at a glance', text_size: 20, color: COLORS.muted })
    button({ x: 75, y: 170, w: 330, h: 78, text: 'Open Google Maps guide', normal_color: COLORS.green, press_color: 0x218c60, click_func: () => push({ url: 'pages/google-navigation/index' }) })
    button({ x: 100, y: 270, w: 280, h: 60, text: saved ? 'Resume RideNav route' : 'RideNav route', click_func: () => push({ url: saved ? 'pages/navigation/index' : 'pages/setup/index' }) })
    button({ x: 140, y: 350, w: 200, h: 46, text: 'Demo / diagnostics', normal_color: 0x303840, press_color: 0x202830, click_func: () => push({ url: 'pages/setup/index', params: { demo: true } }) })
    text({ x: 70, y: 415, w: 340, h: 40, text: 'AOD off recommended', text_size: 17, color: COLORS.amber })
  },
  onCall(data) { const message = incomingCall(data); if (message.valid && message.message.type === 'CLEAR_SESSION') { clearSession(); this.build() } }
}))
