import { BasePage } from '@zeppos/zml/base-page'
import { push } from '@zos/router'
import { Geolocation, checkSensor } from '@zos/sensor'
import { button, COLORS, setText, text, toast } from '../../shared/ui.js'
import { saveSession } from '../../shared/storage.js'
import { requestMessage } from '../../shared/transport.js'

Page(BasePage({
  state: { demo: false, gps: null, status: null, position: null, settings: null },
  onInit(params) { try { this.state.demo = !!JSON.parse(params || '{}').demo } catch (_) {} },
  build() {
    text({ x: 65, y: 45, w: 350, h: 50, text: 'Navigation setup', text_size: 32 })
    this.state.status = text({ x: 55, y: 112, w: 370, h: 90, text: 'Connecting to phone…', text_size: 22, color: COLORS.amber })
    text({ x: 70, y: 215, w: 340, h: 75, text: 'Choose destination and mode\nin the Zepp app settings.', text_size: 19, color: COLORS.muted })
    button({ x: 90, y: 315, w: 300, h: 70, text: this.state.demo ? 'Start demo' : 'Start', click_func: () => this.startNavigation() })
    this.loadSettings()
    this.startGps()
  },
  loadSettings() {
    requestMessage(this, 'GET_SETTINGS').then(({ payload }) => { this.state.settings = payload.settings; setText(this.state.status, `${payload.settings.mode.toUpperCase()} • ${payload.settings.destination || (this.state.demo ? 'Demo route' : 'Destination missing')}\nGPS: ${this.state.position ? 'ready' : 'waiting'}`) }).catch(() => setText(this.state.status, 'Phone disconnected\nDemo mode is still available'))
  },
  startGps() {
    if (!checkSensor(Geolocation)) { setText(this.state.status, 'GPS unavailable'); return }
    this.state.gps = new Geolocation()
    this.state.gpsCallback = () => {
      if (this.state.gps.getStatus() === 'A') {
        const lat = this.state.gps.getLatitude({ format: 'DD' }), lon = this.state.gps.getLongitude({ format: 'DD' })
        if (Number.isFinite(lat) && Number.isFinite(lon)) this.state.position = { lat, lon, timestamp: Date.now() }
      }
    }
    this.state.gps.onChange(this.state.gpsCallback); this.state.gps.start()
  },
  startNavigation() {
    const demo = this.state.demo || this.state.settings?.demoMode
    if (!demo && !this.state.position) return toast('Waiting for GPS')
    if (!demo && !this.state.settings?.destination && !(this.state.settings?.destinationLat && this.state.settings?.destinationLon)) return toast('Destination missing. Add it in Zepp settings.')
    setText(this.state.status, 'Loading route…')
    requestMessage(this, 'ROUTE_REQUEST', { demo, origin: this.state.position, settings: this.state.settings })
      .then(({ payload: { route, settings } }) => {
        const session = { version: 1, active: true, route, settings, destination: settings.destination, mode: settings.mode, sessionStart: Date.now(), stepIndex: 0, alertFlags: [], lastPosition: this.state.position }
        if (!saveSession(session)) throw new Error('Route data too large to save')
        push({ url: 'pages/navigation/index' })
      }).catch(error => push({ url: 'pages/error/index', params: { message: error?.message || String(error) } }))
  },
  onDestroy() { if (this.state.gps) { this.state.gps.offChange(this.state.gpsCallback); this.state.gps.stop() } }
}))
