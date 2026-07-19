import { BasePage } from '@zeppos/zml/base-page'
import * as hmUI from '@zos/ui'
import { home } from '@zos/router'
import { Screen, Vibrator, VIBRATOR_SCENE_NOTIFICATION } from '@zos/sensor'
import { setPageBrightTime, resetPageBrightTime, setWakeUpRelaunch, pauseDropWristScreenOff, resetDropWristScreenOff, pausePalmScreenOff, resetPalmScreenOff } from '@zos/display'
import { arrowAsset, button, COLORS, setText, text, toast } from '../../shared/ui.js'
import { requestMessage } from '../../shared/transport.js'

const BRIGHT_MS = { '30m': 1800000, '1h': 3600000, '2h': 7200000, session: 2147483000 }
const fallbackManeuver = instruction => {
  const value = String(instruction || '').toLowerCase()
  if (value.includes('roundabout')) return { maneuverType: 'roundabout', maneuverModifier: 'right' }
  if (value.includes('u-turn') || value.includes('u turn')) return { maneuverType: 'turn', maneuverModifier: 'u-turn-left' }
  if (value.includes('left')) return { maneuverType: 'turn', maneuverModifier: 'left' }
  if (value.includes('right')) return { maneuverType: 'turn', maneuverModifier: 'right' }
  if (value.includes('arriv')) return { maneuverType: 'arrive', maneuverModifier: 'straight' }
  return { maneuverType: 'continue', maneuverModifier: 'straight' }
}

Page(BasePage({
  state: { widgets: {}, timer: null, busy: false, destroyed: false, instructionSignature: '', vibrator: null, failures: 0, hadActive: false, settings: { vibration: true, screenDuration: '1h' }, endArmed: false },
  build() {
    const w = this.state.widgets
    w.status = text({ x: 55, y: 24, w: 370, h: 34, text: 'Connecting…', text_size: 17, color: COLORS.amber })
    w.arrow = hmUI.createWidget(hmUI.widget.IMG, { x: 145, y: 61, w: 190, h: 190, src: arrowAsset(fallbackManeuver('straight')) })
    w.distance = text({ x: 50, y: 247, w: 380, h: 58, text: '--', text_size: 44 })
    w.instruction = text({ x: 55, y: 303, w: 370, h: 68, text: 'Waiting for Google Maps', text_size: 24, text_style: hmUI.text_style.WRAP })
    w.road = text({ x: 70, y: 372, w: 340, h: 31, text: 'Start navigation on your phone', text_size: 18, color: COLORS.muted })
    w.eta = text({ x: 80, y: 407, w: 320, h: 30, text: '', text_size: 18, color: COLORS.blue })
    w.end = button({ x: 135, y: 443, w: 210, h: 38, text: 'End guide', normal_color: COLORS.red, radius: 19, click_func: () => this.endGuide() })
    this.state.vibrator = new Vibrator()
    requestMessage(this, 'GET_SETTINGS').then(({ payload }) => { this.state.settings = { ...this.state.settings, ...payload.settings }; this.applyDisplay() }).catch(() => this.applyDisplay())
    this.poll()
  },
  applyDisplay() {
    try {
      if (new Screen().getAodMode()) toast('AOD is on. Live guidance may be interrupted.')
      setPageBrightTime({ brightTime: BRIGHT_MS[this.state.settings.screenDuration] || BRIGHT_MS['1h'] })
      pauseDropWristScreenOff({ duration: 0 }); pausePalmScreenOff({ duration: 0 }); setWakeUpRelaunch({ relaunch: true })
    } catch (_) { toast('Some display controls are unavailable') }
  },
  poll() {
    if (this.state.destroyed || this.state.busy) return
    this.state.busy = true
    requestMessage(this, 'GOOGLE_NAV_STATUS', {}, 7000).then(({ payload }) => {
      this.state.failures = 0
      const ageSeconds = payload.updatedAt ? Math.max(0, Math.round((Date.now() - payload.updatedAt) / 1000)) : 0
      if (!payload.active) {
        setText(this.state.widgets.status, payload.stale ? 'Paused • update is stale' : 'Bridge ready')
        setText(this.state.widgets.instruction, this.state.hadActive ? 'Google navigation ended' : 'Waiting for Google Maps')
        setText(this.state.widgets.road, this.state.hadActive ? 'You can end this guide' : 'Start navigation on your phone')
        setText(this.state.widgets.distance, '--'); setText(this.state.widgets.eta, '')
        return
      }
      this.state.hadActive = true
      setText(this.state.widgets.status, ageSeconds <= 5 ? '● Live • updated now' : `● Live • updated ${ageSeconds}s ago`)
      this.state.widgets.status.setProperty(hmUI.prop.COLOR, ageSeconds > 15 ? COLORS.amber : COLORS.green)
      const instructionSignature = String(payload.instruction || '').trim().toLowerCase()
      if (instructionSignature && instructionSignature !== this.state.instructionSignature) {
        this.state.instructionSignature = instructionSignature
        if (this.state.settings.vibration) this.state.vibrator.start({ mode: VIBRATOR_SCENE_NOTIFICATION })
      }
      const maneuver = payload.maneuverType && payload.maneuverType !== 'unknown' ? payload : fallbackManeuver(payload.instruction)
      this.state.widgets.arrow.setProperty(hmUI.prop.SRC, arrowAsset(maneuver))
      setText(this.state.widgets.instruction, payload.instruction || 'Continue')
      setText(this.state.widgets.distance, payload.distance || '--')
      setText(this.state.widgets.road, payload.road || 'Google Maps')
      setText(this.state.widgets.eta, payload.eta ? `ETA ${payload.eta}` : '')
    }).catch(error => {
      this.state.failures += 1
      if (this.state.failures > 1) {
        setText(this.state.widgets.status, 'Connection interrupted')
        setText(this.state.widgets.instruction, 'Relay unavailable')
        setText(this.state.widgets.road, String(error?.message || '').includes('timeout') ? 'Check phone internet' : 'Open RideNav Bridge on phone')
      }
    }).finally(() => {
      this.state.busy = false
      if (!this.state.destroyed) this.state.timer = setTimeout(() => this.poll(), this.state.failures ? 4000 : 2500)
    })
  },
  endGuide() {
    if (this.state.endArmed) return home()
    this.state.endArmed = true; setText(this.state.widgets.end, 'Confirm end')
    setTimeout(() => { this.state.endArmed = false; setText(this.state.widgets.end, 'End guide') }, 5000)
  },
  onDestroy() {
    this.state.destroyed = true
    if (this.state.timer) clearTimeout(this.state.timer)
    try { this.state.vibrator?.stop(); resetPageBrightTime(); resetDropWristScreenOff(); resetPalmScreenOff(); setWakeUpRelaunch({ relaunch: false }) } catch (_) {}
  }
}))
