import { BasePage } from '@zeppos/zml/base-page'
import * as hmUI from '@zos/ui'
import { replace } from '@zos/router'
import { Geolocation, Screen, Vibrator, VIBRATOR_SCENE_SHORT_MIDDLE, VIBRATOR_SCENE_NOTIFICATION, VIBRATOR_SCENE_STRONG_REMINDER, VIBRATOR_SCENE_DURATION } from '@zos/sensor'
import { setPageBrightTime, resetPageBrightTime, setWakeUpRelaunch, pauseDropWristScreenOff, resetDropWristScreenOff, pausePalmScreenOff, resetPalmScreenOff } from '@zos/display'
import { NavigationEngine } from '../../shared/navigation-engine.js'
import { formatDistance, formatDuration, truncate } from '../../shared/format.js'
import { arrowAsset, button, COLORS, setText, setVisible, text, toast } from '../../shared/ui.js'
import { clearSession, loadSession, saveSession } from '../../shared/storage.js'
import { callMessage, incomingCall, requestMessage } from '../../shared/transport.js'

const BRIGHT_MS = { '30m': 1800000, '1h': 3600000, '2h': 7200000, session: 2147483000 }

Page(BasePage({
  state: { session: null, engine: null, gps: null, vibrator: null, widgets: {}, lastSentAt: 0, lastSavedAt: 0, controls: [], destroyed: false },
  onInit() {
    const session = loadSession()
    if (!session) return replace({ url: 'pages/error/index', params: { message: 'Saved navigation session is missing or corrupted.' } })
    this.state.session = session
    try { this.state.engine = new NavigationEngine(session.route, { mode: session.mode, units: session.settings?.units, stepIndex: session.stepIndex, lastPosition: session.lastPosition, alertFlags: session.alertFlags, travelledMeters: session.travelledMeters }) }
    catch (error) { clearSession(); return replace({ url: 'pages/error/index', params: { message: error.message } }) }
  },
  build() {
    if (!this.state.engine) return
    const w = this.state.widgets
    w.touch = hmUI.createWidget(hmUI.widget.BUTTON, { x: 20, y: 50, w: 440, h: 410, text: '', normal_color: 0x000000, press_color: 0x050505, color: 0x000000, radius: 210, click_func: () => this.toggleControls() })
    w.status = text({ x: 55, y: 25, w: 370, h: 34, text: 'GPS …   Phone …', text_size: 17, color: COLORS.amber })
    w.arrow = hmUI.createWidget(hmUI.widget.IMG, { x: 145, y: 65, w: 190, h: 190, src: arrowAsset(this.state.session.route.steps[this.state.engine.stepIndex]) })
    w.distance = text({ x: 50, y: 250, w: 380, h: 58, text: '--', text_size: 44 })
    w.instruction = text({ x: 55, y: 307, w: 370, h: 61, text: 'Waiting for GPS', text_size: 25, text_style: hmUI.text_style.WRAP })
    w.road = text({ x: 75, y: 370, w: 330, h: 31, text: '', text_size: 18, color: COLORS.muted })
    w.trip = text({ x: 80, y: 410, w: 320, h: 33, text: '-- km  •  -- min', text_size: 18, color: COLORS.blue })
    w.tap = text({ x: 145, y: 449, w: 190, h: 22, text: 'Tap for controls', text_size: 14, color: COLORS.muted })
    this.applyDisplayPolicy()
    this.startGps()
    this.renderStep(this.state.session.route.steps[this.state.engine.stepIndex])
  },
  applyDisplayPolicy() {
    try {
      const screen = new Screen()
      if (screen.getAodMode()) toast('For live navigation, turn off Always-On Display in watch settings.')
      setPageBrightTime({ brightTime: BRIGHT_MS[this.state.session.settings?.screenDuration] || BRIGHT_MS['1h'] })
      pauseDropWristScreenOff({ duration: 0 }); pausePalmScreenOff({ duration: 0 }); setWakeUpRelaunch({ relaunch: true })
    } catch (_) { toast('Could not apply all display controls') }
  },
  startGps() {
    this.state.gps = new Geolocation(); this.state.vibrator = new Vibrator()
    this.state.gpsCallback = () => {
      if (this.state.gps.getStatus() !== 'A') return setText(this.state.widgets.status, 'GPS waiting   Phone linked')
      const position = { lat: this.state.gps.getLatitude({ format: 'DD' }), lon: this.state.gps.getLongitude({ format: 'DD' }), timestamp: Date.now() }
      const result = this.state.engine.update(position)
      if (!result.accepted) return
      this.render(result)
      this.handleEvents(result.events, position)
      const interval = result.stationary ? 10000 : result.distanceToManeuver < 100 ? 1500 : 4000
      if (position.timestamp - this.state.lastSentAt >= interval) {
        this.state.lastSentAt = position.timestamp
        callMessage(this, 'POSITION_UPDATE', { lat: position.lat, lon: position.lon, stepIndex: result.stepIndex })
      }
      if (position.timestamp - this.state.lastSavedAt >= 5000) this.persist()
    }
    this.state.gps.onChange(this.state.gpsCallback); this.state.gps.start()
  },
  render(result) {
    setText(this.state.widgets.status, `GPS ready   Phone linked${result.offRoute ? '   OFF ROUTE' : ''}`)
    setText(this.state.widgets.distance, formatDistance(result.distanceToManeuver, this.state.session.settings?.units))
    setText(this.state.widgets.trip, `${formatDistance(result.remainingDistance, this.state.session.settings?.units)}  •  ${formatDuration(result.remainingDuration)}`)
    this.renderStep(result.step)
  },
  renderStep(step) {
    if (!step) return
    this.state.widgets.arrow?.setProperty(hmUI.prop.SRC, arrowAsset(step))
    setText(this.state.widgets.instruction, truncate(step.shortInstruction || step.instruction, 42))
    setText(this.state.widgets.road, truncate(step.roadName, 32))
  },
  handleEvents(events, position) {
    for (const event of events) {
      if (event.type === 'alert') this.vibrate(event.level)
      if (event.type === 'reroute') {
        this.vibrate('offroute'); setText(this.state.widgets.status, 'Off route • rerouting…')
        requestMessage(this, 'REROUTE_REQUEST', { lat: position.lat, lon: position.lon, origin: position, settings: this.state.session.settings }).then(({ payload: { route } }) => {
          this.state.session.route = route; this.state.session.stepIndex = 0
          this.state.engine = new NavigationEngine(route, { mode: this.state.session.mode }); this.persist(); this.vibrate('rerouted')
        }).catch(() => toast('Reroute failed. Continue to reconnect.'))
      }
      if (event.type === 'arrival') this.finish(true)
    }
  },
  vibrate(level) {
    if (!this.state.session.settings?.vibration || !this.state.vibrator) return
    const modes = { early: VIBRATOR_SCENE_SHORT_MIDDLE, prepare: VIBRATOR_SCENE_NOTIFICATION, final: VIBRATOR_SCENE_STRONG_REMINDER, offroute: VIBRATOR_SCENE_STRONG_REMINDER, rerouted: VIBRATOR_SCENE_NOTIFICATION, arrival: VIBRATOR_SCENE_DURATION }
    this.state.vibrator.start({ mode: modes[level] || VIBRATOR_SCENE_SHORT_MIDDLE })
  },
  toggleControls() {
    if (this.state.controls.length) { this.state.controls.forEach(w => hmUI.deleteWidget(w)); this.state.controls = []; return }
    const panel = hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 55, y: 105, w: 370, h: 275, color: 0x111820, radius: 30 })
    const resume = button({ x: 100, y: 135, w: 280, h: 55, text: 'Resume', click_func: () => this.toggleControls() })
    const reroute = button({ x: 100, y: 210, w: 280, h: 55, text: 'Reroute', normal_color: COLORS.amber, click_func: () => { this.state.engine.lastRerouteAt = 0; toast('Reroute will start on next GPS fix'); this.toggleControls() } })
    const end = button({ x: 100, y: 285, w: 280, h: 55, text: this.state.endArmed ? 'Confirm end' : 'End navigation', normal_color: COLORS.red, click_func: () => {
      if (this.state.endArmed) this.finish(false)
      else { this.state.endArmed = true; toast('Tap End navigation again to confirm'); this.toggleControls() }
    } })
    this.state.controls = [panel, resume, reroute, end]
  },
  persist() {
    const snapshot = this.state.engine.snapshot(); Object.assign(this.state.session, snapshot, { route: this.state.engine.route, active: true })
    this.state.lastSavedAt = Date.now(); saveSession(this.state.session)
  },
  finish(arrived) {
    if (arrived) this.vibrate('arrival')
    this.persist(); this.state.session.active = false
    const params = { arrived, duration: Date.now() - this.state.session.sessionStart, distance: this.state.engine.travelledMeters }
    clearSession(); this.cleanup(); replace({ url: 'pages/summary/index', params })
  },
  cleanup() {
    if (this.state.destroyed) return
    this.state.destroyed = true
    try { if (this.state.gps) { this.state.gps.offChange(this.state.gpsCallback); this.state.gps.stop() }; this.state.vibrator?.stop() } catch (_) {}
    try { resetPageBrightTime(); resetDropWristScreenOff(); resetPalmScreenOff(); setWakeUpRelaunch({ relaunch: false }) } catch (_) {}
  },
  onCall(data) {
    const validation = incomingCall(data)
    if (!validation.valid) return
    if (validation.message.type === 'CLEAR_SESSION') { clearSession(); this.cleanup(); replace({ url: 'pages/error/index', params: { message: 'Navigation session was cleared from the Zepp app.' } }) }
    if (validation.message.type === 'SETTINGS_CHANGED') this.state.session.settings = { ...this.state.session.settings, ...validation.message.payload.settings }
  },
  onDestroy() { if (!this.state.destroyed) { this.persist(); this.cleanup() } }
}))
