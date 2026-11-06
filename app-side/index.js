import { normalizeSettings, watchSettings } from '../shared/settings.js'
import { BaseSideService } from '@zeppos/zml/base-side'
import { readSettings } from './services/settings.js'
import { getRoute } from './services/routing.js'
import { createMessage, validateMessage } from '../shared/protocol.js'
import { getGoogleNavigationStatus } from './services/google-bridge.js'

const handled = new Map()
const prune = () => { const now = Date.now(); for (const [key, time] of handled) if (now - time.at > 60000 && time.complete) handled.delete(key) }

AppSideService(BaseSideService({
  onInit() { console.log('[RideNav][Side] initialized') },
  async onRequest(req, res) {
    prune()
    try {
      if (req.method !== 'PROTOCOL') return res('Unknown transport request')
      const validation = validateMessage(req.params?.message)
      if (!validation.valid) return res(validation.error || 'Invalid protocol message')
      const message = validation.message
      if (message.type === 'GET_SETTINGS') return res(null, { message: createMessage('SETTINGS_CHANGED', { settings: watchSettings(readSettings()) }, message.requestId) })
      if (message.type === 'GOOGLE_NAV_STATUS') {
        const status = await getGoogleNavigationStatus()
        return res(null, { message: createMessage('GOOGLE_NAV_RESPONSE', status, message.requestId) })
      }
      if (message.type === 'ROUTE_REQUEST' || message.type === 'REROUTE_REQUEST') {
        const key = message.requestId
        let entry = handled.get(key)
        if (!entry) {
          const phoneSettings = readSettings()
          const settings = normalizeSettings({ ...phoneSettings, ...(message.payload.settings || {}), mapboxToken: phoneSettings.mapboxToken, backendToken: phoneSettings.backendToken, backendUrl: phoneSettings.backendUrl })
          entry = { at: Date.now(), complete: false }
          entry.promise = getRoute(message.payload.origin, settings, !!message.payload.demo).then(route => createMessage('ROUTE_RESPONSE', { route, settings: watchSettings(settings) }, key)).finally(() => { entry.complete = true })
          handled.set(key, entry)
        }
        return res(null, { message: await entry.promise })
      }
      return res(`Unsupported message: ${message.type}`)
    } catch (error) {
      console.log(`[RideNav][Side] ${error?.message || 'routing error'}`)
      const id = req.params?.message?.requestId || 'unknown'
      return res(null, { message: createMessage('ROUTE_ERROR', { message: error?.message || 'Routing failed' }, id) })
    }
  },
  onCall(data) {
    const validation = validateMessage(data?.params?.message || data?.message)
    if (validation.valid && validation.message.type === 'POSITION_UPDATE') console.log('[RideNav][Side] position update received')
  },
  onSettingsChange({ key }) {
    const type = key === 'ridenav.clearSession' ? 'CLEAR_SESSION' : 'SETTINGS_CHANGED'
    this.call({ method: 'PROTOCOL', params: { message: createMessage(type, type === 'SETTINGS_CHANGED' ? { settings: watchSettings(readSettings()) } : {}) } })
  },
  onRun() {},
  onDestroy() { handled.clear(); console.log('[RideNav][Side] destroyed') }
}))
