import { settingsLib } from '@zeppos/zml/base-side'
import { normalizeSettings } from '../../shared/settings.js'
import { DEFAULT_SETTINGS } from '../../shared/constants.js'

export function readSettings() {
  const stored = {}
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const value = settingsLib.getItem(`ridenav.${key}`)
    if (value !== undefined && value !== null && value !== '') {
      try { stored[key] = JSON.parse(value) } catch (_) { stored[key] = value }
    }
  }
  return normalizeSettings(stored)
}
