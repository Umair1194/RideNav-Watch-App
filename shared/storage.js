import { watchSettings } from './settings.js'
import { LocalStorage } from '@zos/storage'
const storage = new LocalStorage()
const SESSION_KEY = 'ride-nav-active-session-v1'

export function saveSession(session) {
  try { storage.setItem(SESSION_KEY, JSON.stringify({ ...session, settings: watchSettings(session.settings) })); return true } catch (_) { return false }
}
export function loadSession() {
  try {
    const raw = storage.getItem(SESSION_KEY, '')
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session || session.version !== 1 || !session.active || !session.route) throw new Error('invalid')
    session.settings = watchSettings(session.settings)
    return session
  } catch (_) { storage.removeItem(SESSION_KEY); return null }
}
export function clearSession() { storage.removeItem(SESSION_KEY) }
