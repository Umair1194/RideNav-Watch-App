import { BasePage } from '@zeppos/zml/base-page'
import { home } from '@zos/router'
import { button, COLORS, text } from '../../shared/ui.js'
import { formatDistance, formatDuration } from '../../shared/format.js'

Page(BasePage({
  state: { data: {} },
  onInit(params) { try { this.state.data = JSON.parse(params || '{}') } catch (_) {} },
  build() {
    text({ x: 60, y: 70, w: 360, h: 65, text: this.state.data.arrived ? 'Arrived' : 'Navigation ended', text_size: 40, color: this.state.data.arrived ? COLORS.green : COLORS.white })
    text({ x: 70, y: 165, w: 340, h: 100, text: `${formatDistance(this.state.data.distance || 0)}\n${formatDuration((this.state.data.duration || 0) / 1000)}`, text_size: 30 })
    button({ x: 100, y: 320, w: 280, h: 68, text: 'Done', click_func: () => home() })
  }
}))
