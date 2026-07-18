import { BasePage } from '@zeppos/zml/base-page'
import { back, home } from '@zos/router'
import { button, COLORS, text } from '../../shared/ui.js'

Page(BasePage({
  state: { message: 'Navigation error' },
  onInit(params) { try { this.state.message = JSON.parse(params || '{}').message || this.state.message } catch (_) {} },
  build() {
    text({ x: 65, y: 60, w: 350, h: 50, text: 'Could not navigate', text_size: 31, color: COLORS.red })
    text({ x: 65, y: 135, w: 350, h: 145, text: this.state.message, text_size: 21, text_style: 1 })
    text({ x: 70, y: 285, w: 340, h: 55, text: 'Check phone connection and Zepp settings.', text_size: 17, color: COLORS.muted })
    button({ x: 75, y: 365, w: 155, h: 58, text: 'Retry', click_func: () => back() })
    button({ x: 250, y: 365, w: 155, h: 58, text: 'End', normal_color: COLORS.red, click_func: () => home() })
  }
}))
