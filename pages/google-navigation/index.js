import { BasePage } from '@zeppos/zml/base-page'
import * as hmUI from '@zos/ui'
import { home, push } from '@zos/router'
import { Screen, Vibrator, VIBRATOR_SCENE_NOTIFICATION, VIBRATOR_SCENE_STRONG_REMINDER, VIBRATOR_SCENE_DURATION } from '@zos/sensor'
import { setPageBrightTime, resetPageBrightTime, setWakeUpRelaunch, pauseDropWristScreenOff, resetDropWristScreenOff, pausePalmScreenOff, resetPalmScreenOff } from '@zos/display'
import { arrowAsset, button, COLORS, setText, setVisible, text, toast } from '../../shared/ui.js'
import { requestMessage } from '../../shared/transport.js'
import { beginWatchSession, endWatchSession, isCurrentWatchSession } from '../../shared/watch-session.js'
import { distanceToMeters, GoogleNavSession } from '../../shared/google-nav-session.js'

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
  state: { widgets: {}, controls: [], timer: null, busy: false, destroyed: false, generation: 0, instructionSignature: '', vibrator: null, failures: 0, settings: { vibration: true, hapticMode: 'all', hapticStrength: 'normal', displayMode: 'auto', textSize: 'standard', screenDuration: '1h' }, endArmed: false, nav: null },
  build() {
    const generation = beginWatchSession(this.state)
    this.state.nav = new GoogleNavSession()
    const w = this.state.widgets
    w.status = text({ x: 75, y: 22, w: 330, h: 32, text: '● CONNECTING', text_size: 16, color: COLORS.amber })
    w.menu = button({ x: 405, y: 20, w: 48, h: 34, text: '•••', text_size: 16, normal_color: 0x202830, press_color: 0x303840, radius: 17, click_func: () => this.toggleControls() })
    w.arrow = hmUI.createWidget(hmUI.widget.IMG, { x: 130, y: 54, w: 220, h: 220, src: arrowAsset(fallbackManeuver('straight')) })
    w.distance = text({ x: 45, y: 270, w: 390, h: 58, text: '--', text_size: 48 })
    w.instruction = text({ x: 48, y: 326, w: 384, h: 58, text: 'Waiting for Google Maps', text_size: 25, text_style: hmUI.text_style.WRAP })
    w.road = text({ x: 65, y: 384, w: 350, h: 28, text: 'Start navigation on your phone', text_size: 17, color: COLORS.muted })
    w.next = text({ x: 55, y: 414, w: 370, h: 27, text: '', text_size: 16, color: COLORS.amber })
    w.eta = text({ x: 70, y: 445, w: 340, h: 25, text: '', text_size: 16, color: COLORS.blue })
    this.state.vibrator = new Vibrator()
    requestMessage(this, 'GET_SETTINGS').then(({ payload }) => {
      if (!isCurrentWatchSession(this.state, generation)) return
      this.state.settings = { ...this.state.settings, ...payload.settings }
      this.applyDisplay()
      this.applyAccessibility()
    }).catch(() => this.applyDisplay())
    this.poll(generation)
  },
  applyDisplay() {
    try {
      if (new Screen().getAodMode()) toast('AOD may interrupt live guidance')
      setPageBrightTime({ brightTime: BRIGHT_MS[this.state.settings.screenDuration] || BRIGHT_MS['1h'] })
      pauseDropWristScreenOff({ duration: 0 }); pausePalmScreenOff({ duration: 0 }); setWakeUpRelaunch({ relaunch: true })
    } catch (_) { toast('Some display controls are unavailable') }
  },
  applyAccessibility() {
    const large = this.state.settings.textSize === 'large'
    const sunlight = this.state.settings.displayMode === 'sunlight'
    this.state.widgets.distance?.setProperty(hmUI.prop.MORE, { text_size: large || sunlight ? 54 : 48, color: COLORS.white })
    this.state.widgets.instruction?.setProperty(hmUI.prop.MORE, { text_size: large ? 28 : 25, color: COLORS.white })
    this.state.widgets.road?.setProperty(hmUI.prop.MORE, { text_size: large ? 20 : 17, color: sunlight ? COLORS.white : COLORS.muted })
  },
  poll(generation = this.state.generation) {
    if (!isCurrentWatchSession(this.state, generation) || this.state.busy) return
    this.state.busy = true
    requestMessage(this, 'GOOGLE_NAV_STATUS', {}, 10000).then(({ payload }) => {
      if (!isCurrentWatchSession(this.state, generation)) return
      this.state.failures = 0
      this.renderView(this.state.nav.success(payload))
    }).catch(error => {
      if (!isCurrentWatchSession(this.state, generation)) return
      this.state.failures += 1
      this.renderView(this.state.nav.failure(error))
      if (this.state.failures === 3) this.vibrate('warning')
    }).finally(() => {
      if (!isCurrentWatchSession(this.state, generation)) return
      this.state.busy = false
      this.state.timer = setTimeout(() => this.poll(generation), this.state.failures ? 3500 : 2500)
    })
  },
  renderView(view) {
    if (view.mode === 'live' || view.mode === 'grace') return this.renderGuidance(view.payload, view)
    if (view.mode === 'arrived') {
      this.setStatus('✓ ARRIVED', COLORS.green)
      this.state.widgets.arrow.setProperty(hmUI.prop.SRC, arrowAsset({ maneuverType: 'arrive' }))
      setText(this.state.widgets.distance, '✓')
      setText(this.state.widgets.instruction, 'You have arrived')
      setText(this.state.widgets.road, 'Waiting for your next route')
      setText(this.state.widgets.next, '')
      setText(this.state.widgets.eta, 'New directions start automatically')
      if (this.state.instructionSignature !== '__arrived__') { this.state.instructionSignature = '__arrived__'; this.vibrate('arrival') }
      return
    }
    const sleeping = view.mode === 'bridge-sleeping'
    const auth = view.mode === 'authentication'
    const reconnecting = view.mode === 'reconnecting' || auth
    this.setStatus(reconnecting ? '● RECONNECTING' : sleeping ? '● PHONE SLEEPING' : '● READY', reconnecting || sleeping ? COLORS.amber : COLORS.green)
    this.state.widgets.arrow.setProperty(hmUI.prop.SRC, arrowAsset(fallbackManeuver('straight')))
    setText(this.state.widgets.distance, '--')
    setText(this.state.widgets.instruction, auth ? 'Relay needs attention' : reconnecting ? 'Restoring directions…' : 'Waiting for Google Maps')
    setText(this.state.widgets.road, sleeping ? 'Open RideNav Bridge on phone' : reconnecting ? 'Checking phone and cloud' : 'Start a route on your phone')
    setText(this.state.widgets.next, '')
    setText(this.state.widgets.eta, reconnecting ? 'Last direction is no longer live' : 'Directions appear automatically')
  },
  renderGuidance(payload, view) {
    const age = payload.updatedAt ? Math.max(0, Math.round((Date.now() - payload.updatedAt) / 1000)) : 0
    const delayed = view.mode === 'grace' || age > 15
    this.setStatus(delayed ? '● UPDATING' : payload.source === 'phone-local' ? '● LIVE • LOCAL' : '● LIVE', delayed ? COLORS.amber : COLORS.green)
    const maneuver = payload.maneuverType && payload.maneuverType !== 'unknown' ? payload : fallbackManeuver(payload.instruction)
    this.state.widgets.arrow.setProperty(hmUI.prop.SRC, arrowAsset(maneuver))
    const meters = distanceToMeters(payload.distance)
    this.state.widgets.distance.setProperty(hmUI.prop.COLOR, meters <= 25 ? COLORS.red : meters <= 80 ? COLORS.amber : COLORS.white)
    setText(this.state.widgets.distance, payload.distance || '--')
    setText(this.state.widgets.instruction, payload.instruction || 'Continue')
    setText(this.state.widgets.road, payload.road || 'Google Maps')
    setText(this.state.widgets.next, payload.nextInstruction ? `Then: ${payload.nextInstruction}${payload.nextDistance && !payload.nextInstruction.includes(payload.nextDistance) ? ` • ${payload.nextDistance}` : ''}` : '')
    setText(this.state.widgets.eta, view.mode === 'grace' ? 'Updating phone connection…' : payload.eta ? `ETA ${payload.eta}` : '')
    const signature = `${payload.instruction}|${payload.distance}`.toLowerCase()
    if (signature && signature !== this.state.instructionSignature) {
      this.state.instructionSignature = signature
      this.vibrate(meters <= 50 ? 'final' : 'maneuver')
    }
  },
  setStatus(value, color) {
    setText(this.state.widgets.status, value)
    this.state.widgets.status?.setProperty(hmUI.prop.COLOR, color)
  },
  vibrate(kind) {
    const settings = this.state.settings
    if (!settings.vibration || settings.hapticMode === 'off' || !this.state.vibrator) return
    if (settings.hapticMode === 'important' && kind === 'maneuver') return
    const strong = settings.hapticStrength === 'strong' || kind === 'final' || kind === 'warning'
    const mode = kind === 'arrival' ? VIBRATOR_SCENE_DURATION : strong ? VIBRATOR_SCENE_STRONG_REMINDER : VIBRATOR_SCENE_NOTIFICATION
    this.state.vibrator.start({ mode })
  },
  toggleControls() {
    if (this.state.controls.length) { this.state.controls.forEach(widget => hmUI.deleteWidget(widget)); this.state.controls = []; return }
    const panel = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 45, y: 105, w: 390, h: 280, color: 0x111820, radius: 28 })
    const resume = button({ x: 95, y: 132, w: 290, h: 55, text: 'Keep navigating', click_func: () => this.toggleControls() })
    const diagnostics = button({ x: 95, y: 207, w: 290, h: 55, text: 'Connection details', normal_color: 0x303840, click_func: () => push({ url: 'pages/diagnostics/index' }) })
    const end = button({ x: 95, y: 282, w: 290, h: 55, text: this.state.endArmed ? 'Confirm close' : 'Close RideNav', normal_color: COLORS.red, click_func: () => {
      if (this.state.endArmed) return home()
      this.state.endArmed = true; this.toggleControls(); toast('Open controls and confirm close')
    } })
    this.state.controls = [panel, resume, diagnostics, end]
  },
  onDestroy() {
    if (this.state.timer) clearTimeout(this.state.timer)
    endWatchSession(this.state)
    try { this.state.vibrator?.stop(); resetPageBrightTime(); resetDropWristScreenOff(); resetPalmScreenOff(); setWakeUpRelaunch({ relaunch: false }) } catch (_) {}
  }
}))
