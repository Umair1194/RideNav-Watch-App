import { DEFAULT_SETTINGS } from './constants.js'
const enums = { mode: ['car', 'bike', 'walk'], units: ['metric', 'imperial'], hapticMode: ['all', 'important', 'off'], hapticStrength: ['normal', 'strong'], displayMode: ['auto', 'sunlight'], textSize: ['standard', 'large'], screenDuration: ['30m', '1h', '2h', 'session'], provider: ['demo', 'mapbox', 'backend'] }
export function normalizeSettings(input = {}) {
  const output = { ...DEFAULT_SETTINGS }
  for (const key of Object.keys(output)) {
    if (input[key] === undefined || input[key] === null) continue
    if (enums[key]) { if (enums[key].includes(input[key])) output[key] = input[key] }
    else if (typeof output[key] === 'boolean') { if (typeof input[key] === 'boolean') output[key] = input[key] }
    else if (typeof input[key] === 'string' || typeof input[key] === 'number') output[key] = String(input[key]).slice(0, key.includes('Token') || key === 'backendUrl' ? 2048 : 240)
  }
  return output
}

export function watchSettings(settings) {
  const { mapboxToken, backendToken, backendUrl, ...publicSettings } = normalizeSettings(settings)
  return publicSettings
}
