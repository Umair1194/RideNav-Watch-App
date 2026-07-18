import { DEFAULT_SETTINGS } from '../shared/constants.js'

const storageKey = key => `ridenav.${key}`
const read = (props, key) => {
  const raw = props.settingsStorage.getItem(storageKey(key))
  if (raw === undefined || raw === null || raw === '') return DEFAULT_SETTINGS[key]
  try { return JSON.parse(raw) } catch (_) { return raw }
}
const write = (props, key, value) => props.settingsStorage.setItem(storageKey(key), JSON.stringify(value))

AppSettingsPage({
  build(props) {
    const field = (label, key, options = {}) => TextInput({ label, value: String(read(props, key) ?? ''), subStyle: { color: '#333', fontSize: '14px' }, ...options,
      onChange: value => write(props, key, value) })
    const select = (label, key, options) => Select({ label, selectViewTitle: label, options: options.map(item => ({ name: item.label, value: item.value })),
      value: read(props, key), onChange: value => write(props, key, value) })
    const toggle = (label, key) => Toggle({ label, value: !!read(props, key), onChange: value => write(props, key, value) })

    return View({ style: { padding: '18px 20px' } }, [
      Text({ style: { fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' } }, 'RideNav Balance'),
      Text({ style: { color: '#666', marginBottom: '16px' } }, 'Destination selection and routing run on your phone. The watch uses location only during active foreground navigation.'),
      field('Destination', 'destination', { placeholder: 'Street, city or place' }),
      field('Destination latitude (optional)', 'destinationLat', { placeholder: '31.5204' }),
      field('Destination longitude (optional)', 'destinationLon', { placeholder: '74.3587' }),
      select('Travel mode', 'mode', [{label:'Driving',value:'car'},{label:'Cycling',value:'bike'},{label:'Walking',value:'walk'}]),
      select('Units', 'units', [{label:'Metric',value:'metric'},{label:'Imperial',value:'imperial'}]),
      toggle('Vibration alerts', 'vibration'),
      toggle('Early-turn alerts', 'earlyAlerts'),
      select('Screen active duration', 'screenDuration', [{label:'30 minutes',value:'30m'},{label:'1 hour',value:'1h'},{label:'2 hours',value:'2h'},{label:'Entire session',value:'session'}]),
      select('Routing provider', 'provider', [{label:'Demo (no key)',value:'demo'},{label:'Mapbox development',value:'mapbox'},{label:'Production backend',value:'backend'}]),
      toggle('Demo mode', 'demoMode'),
      field('Mapbox access token', 'mapboxToken', { placeholder: '[MAPBOX_ACCESS_TOKEN]' }),
      field('Production backend URL', 'backendUrl', { placeholder: '[ROUTING_BACKEND_URL]' }),
      Button({ label: 'Clear active navigation session', onClick: () => props.settingsStorage.setItem('ridenav.clearSession', String(Date.now())) }),
      Text({ style: { color: '#b45309', marginTop: '14px' } }, 'Development warning: tokens stored in a client app can be extracted. Use a developer-owned backend proxy for production.'),
      Text({ style: { color: '#666', marginTop: '10px' } }, 'Always-On Display cannot be replaced by this app. Disable AOD for reliable live navigation. Keeping GNSS and the screen active increases battery use.')
    ])
  }
})
