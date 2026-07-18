export function formatDistance(meters, units = 'metric') {
  if (!Number.isFinite(meters)) return '--'
  if (units === 'imperial') {
    const feet = meters * 3.28084
    return feet < 1000 ? `${Math.max(0, Math.round(feet / 10) * 10)} ft` : `${(meters / 1609.344).toFixed(meters < 16093 ? 1 : 0)} mi`
  }
  return meters < 1000 ? `${Math.max(0, Math.round(meters / 5) * 5)} m` : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '--'
  const minutes = Math.max(0, Math.round(seconds / 60))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function truncate(text, max = 34) {
  const value = String(text || '')
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}
