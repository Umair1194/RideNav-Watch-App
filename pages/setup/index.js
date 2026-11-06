import { BasePage } from '@zeppos/zml/base-page'
import { push } from '@zos/router'
import { Geolocation, checkSensor } from '@zos/sensor'
import { button, COLORS, setText, text, toast } from '../../shared/ui.js'
import { saveSession } from '../../shared/storage.js'
import { requestMessage } from '../../shared/transport.js'
import { beginWatchSession, endWatchSession, isCurrentWatchSession } from '../../shared/watch-session.js'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'
import { demoRoute } from '../../fixtures/demo-route.js'

Page(BasePage({
  state: { demo: false, gps: null, status: null, position: null, settings: null },
  onInit(params) { try { this.state.demo = !!JSON.parse(params || '{}').demo } catch (_) {} },
  build() {
    const generation = beginWatchSession(this.state)
    this.state.position = null
    this.state.settings = null
    text({ x: 65, y: 45, w: 350, h: 50, text: 'Navigation setup', text_size: 32 })
    this.state.status = text({ x: 55, y: 112, w: 370, h: 90, text: 'Connecting to phone…', text_size: 22, color: COLORS.amber })
    text({ x: 70, y: 215, w: 340, h: 75, text: 'Choose destination and mode\nin the Zepp app settings.', text_size: 19, color: COLORS.muted })
    button({ x: 90, y: 315, w: 300, h: 70, text: this.state.demo ? 'Start demo' : 'Start', click_func: () => this.startNavigation() })
    requestMessage(this, 'GET_SETTINGS').then(({ payload }) => {
      if (!isCurrentWatchSession(this.state, generation)) return
      this.state.settings = { ...DEFAULT_SETTINGS, ...payload.settings }
      this.renderStatus()
    }).catch(() => { if (isCurrentWatchSession(this.state, generation)) setText(this.state.status, 'Phone disconnected\nDemo mode is still available') })
    if (checkSensor(Geolocation)) {
      this.state.gps = new Geolocation()
      this.state.gpsCallback = () => {
        if (!isCurrentWatchSession(this.state, generation) || this.state.gps.getStatus() !== 'A') return
        const lat = this.state.gps.getLatitude({ format: 'DD' }), lon = this.state.gps.getLongitude({ format: 'DD' })
        if (Number.isFinite(lat) && Number.isFinite(lon)) { this.state.position = { lat, lon, timestamp: Date.now() }; this.renderStatus() }
      }
      this.state.gps.onChange(this.state.gpsCallback); this.state.gps.start()
    }
  },
  renderStatus() {
    if (this.state.busy) return
    const settings = this.state.settings
    setText(this.state.status, `${String(settings?.mode || 'bike').toUpperCase()} • ${this.state.demo ? 'Demo route' : settings?.destination || 'Choose destination on phone'}\nGPS: ${this.state.position ? 'ready' : 'waiting'}`)
  },
  async startNavigation() {
    if (this.state.busy) return
    const generation = this.state.generation
    const settings = { ...DEFAULT_SETTINGS, ...this.state.settings }
    const demo = this.state.demo || settings.demoMode || settings.provider === 'demo'
    if (!demo && (!this.state.position || Date.now() - this.state.position.timestamp > 30000)) return toast('Waiting for a fresh GPS fix')
    if (!demo && !settings.destination && !(String(settings.destinationLat).trim() && String(settings.destinationLon).trim())) return toast('Add destination in Zepp settings')
    this.state.busy = true
    setText(this.state.status, 'Loading route…')
    try {
      const result = demo ? { payload: { route: { ...demoRoute, mode: settings.mode }, settings } } : await requestMessage(this, 'ROUTE_REQUEST', { demo: false, origin: this.state.position, settings })
      if (!isCurrentWatchSession(this.state, generation)) return
      const route = result.payload.route, routeSettings = result.payload.settings
      const session = { version: 1, active: true, route, settings: routeSettings, destination: routeSettings.destination, mode: routeSettings.mode, sessionStart: Date.now(), stepIndex: 0, alertFlags: [], lastPosition: demo ? null : this.state.position }
      if (!saveSession(session)) throw new Error('Route data too large to save')
      push({ url: 'pages/navigation/index' })
    } catch (error) {
      if (isCurrentWatchSession(this.state, generation)) push({ url: 'pages/error/index', params: { message: error?.message || String(error) } })
    } finally { if (isCurrentWatchSession(this.state, generation)) this.state.busy = false }
  },
  onDestroy() {
    endWatchSession(this.state)
    if (this.state.gps) { this.state.gps.offChange(this.state.gpsCallback); this.state.gps.stop(); this.state.gps = null }
  }
}))
