import * as hmUI from '@zos/ui'

export const COLORS = { bg: 0x000000, white: 0xffffff, muted: 0x9aa0a6, blue: 0x43a6ff, green: 0x39d98a, amber: 0xffb020, red: 0xff4d4f }
export function text(options) { return hmUI.createWidget(hmUI.widget.TEXT, { color: COLORS.white, align_h: hmUI.align.CENTER_H, text_style: hmUI.text_style.NONE, ...options }) }
export function button(options) { return hmUI.createWidget(hmUI.widget.BUTTON, { normal_color: 0x155fa0, press_color: 0x104b80, color: COLORS.white, text_size: 24, radius: 32, ...options }) }
export function setText(widget, value) { if (widget) widget.setProperty(hmUI.prop.TEXT, String(value ?? '')) }
export function setVisible(widget, value) { if (widget) widget.setProperty(hmUI.prop.VISIBLE, !!value) }
export function toast(value) { hmUI.showToast({ text: String(value) }) }
export function arrowAsset(step) {
  const type = step?.maneuverType || 'unknown', mod = step?.maneuverModifier || 'straight'
  if (type === 'arrive') return 'arrows/arrive.png'
  if (type === 'roundabout') return 'arrows/roundabout.png'
  if (type === 'merge' || type === 'fork' || type === 'ramp') return `arrows/${type}-${mod === 'left' ? 'left' : 'right'}.png`
  if (mod === 'u-turn' || mod === 'u-turn-left' || mod === 'u-turn-right') return `arrows/${mod === 'u-turn-right' ? 'u-turn-right' : 'u-turn-left'}.png`
  return `arrows/${['straight','slight-left','left','sharp-left','slight-right','right','sharp-right'].includes(mod) ? mod : 'unknown'}.png`
}
