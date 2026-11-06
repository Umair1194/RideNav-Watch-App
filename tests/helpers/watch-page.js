import fs from 'node:fs'
import vm from 'node:vm'
import { beginWatchSession, endWatchSession, isCurrentWatchSession } from '../../shared/watch-session.js'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'
import { demoRoute } from '../../fixtures/demo-route.js'
import { GoogleNavSession, distanceToMeters } from '../../shared/google-nav-session.js'
import { NavigationEngine } from '../../shared/navigation-engine.js'
import { formatDistance, formatDuration, truncate } from '../../shared/format.js'
export function watchPage(name, overrides = {}) {
  const widgets = [], navigation = [], timers = []
  const widget = options => { const w = { ...options, setProperty(key, value) { if (key === 'MORE') Object.assign(this, value); else this[key.toLowerCase()] = value } }; widgets.push(w); return w }
  const hmUI = { widget: { TEXT: 'TEXT', BUTTON: 'BUTTON', IMG: 'IMG', FILL_RECT: 'FILL_RECT' }, prop: { TEXT: 'TEXT', COLOR: 'COLOR', SRC: 'SRC', MORE: 'MORE' }, text_style: { WRAP: 1 }, createWidget: (_, options) => widget(options), deleteWidget: () => {}, showToast: () => {}, align: { CENTER_H: 0 } }
  const uiScope = { hmUI }
  vm.runInNewContext(fs.readFileSync('shared/ui.js', 'utf8').replace(/^import .+\n/gm, '').replaceAll('export ', '') + '\nglobalThis.ui = {text,button,setText,toast,arrowAsset,COLORS}', uiScope)
  let page
  const scope = {
    console, Date, Promise, Number, Object, JSON, String, Math, Infinity,
    BasePage: value => value, Page: value => { page = value }, hmUI,
    beginWatchSession, endWatchSession, isCurrentWatchSession, DEFAULT_SETTINGS, demoRoute, GoogleNavSession, distanceToMeters, NavigationEngine, formatDistance, formatDuration, truncate,
    text: widget, button: widget, setText: (w, value) => { if (w) w.text = value }, toast: () => {}, arrowAsset: () => 'arrows/straight.png',
    COLORS: { white: 0xffffff, muted: 0x9aa0a6, amber: 0xffb020, green: 0x39d98a, blue: 0x43a6ff, red: 0xff4d4f },
    push: value => navigation.push(value), replace: value => navigation.push(value), back: () => {}, home: () => {},
    requestMessage: () => new Promise(() => {}), incomingCall: () => ({ valid: false }), callMessage: () => {},
    loadSession: () => null, clearSession: () => {}, saveSession: () => true,
    Geolocation: class {}, checkSensor: () => false, Vibrator: class { start() {} stop() {} }, Screen: class { getAodMode() { return false } },
    setPageBrightTime() {}, resetPageBrightTime() {}, setWakeUpRelaunch() {}, pauseDropWristScreenOff() {}, resetDropWristScreenOff() {}, pausePalmScreenOff() {}, resetPalmScreenOff() {},
    VIBRATOR_SCENE_NOTIFICATION: 1, VIBRATOR_SCENE_STRONG_REMINDER: 2, VIBRATOR_SCENE_DURATION: 3, VIBRATOR_SCENE_SHORT_MIDDLE: 4,
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length }, clearTimeout() {}, ...uiScope.ui, ...overrides
  }
  const source = fs.readFileSync(`pages/${name}/index.js`, 'utf8').replace(/^import .+\n/gm, '')
  vm.runInNewContext(source, scope, { filename: `pages/${name}/index.js` })
  return { page, widgets, navigation, timers }
}
export const settle = () => new Promise(resolve => setImmediate(resolve))
