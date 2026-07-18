const EARTH_RADIUS_M = 6371008.8
const rad = value => value * Math.PI / 180
const deg = value => value * 180 / Math.PI

export function isCoordinate(point) {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lon) &&
    point.lat >= -90 && point.lat <= 90 && point.lon >= -180 && point.lon <= 180
}

export function haversine(a, b) {
  if (!isCoordinate(a) || !isCoordinate(b)) return Infinity
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const lat1 = rad(a.lat)
  const lat2 = rad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function bearing(a, b) {
  if (!isCoordinate(a) || !isCoordinate(b)) return 0
  const p1 = rad(a.lat), p2 = rad(b.lat), dLon = rad(b.lon - a.lon)
  return normalizeAngle(deg(Math.atan2(Math.sin(dLon) * Math.cos(p2),
    Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLon))))
}

export function normalizeAngle(value) {
  return ((value % 360) + 360) % 360
}

export function angleDifference(a, b) {
  const d = Math.abs(normalizeAngle(a) - normalizeAngle(b))
  return Math.min(d, 360 - d)
}

export function closestPointOnSegment(point, start, end) {
  if (![point, start, end].every(isCoordinate)) return { point: null, fraction: 0, distance: Infinity }
  const lat0 = rad((start.lat + end.lat + point.lat) / 3)
  const scaleX = Math.cos(lat0) * 111320
  const scaleY = 110540
  const px = (point.lon - start.lon) * scaleX, py = (point.lat - start.lat) * scaleY
  const ex = (end.lon - start.lon) * scaleX, ey = (end.lat - start.lat) * scaleY
  const len2 = ex * ex + ey * ey
  const fraction = len2 ? Math.max(0, Math.min(1, (px * ex + py * ey) / len2)) : 0
  const result = { lat: start.lat + (end.lat - start.lat) * fraction, lon: start.lon + (end.lon - start.lon) * fraction }
  return { point: result, fraction, distance: haversine(point, result) }
}

export function nearestRoutePoint(point, geometry, from = 0, to = geometry.length - 1) {
  let best = { distance: Infinity, segmentIndex: from, fraction: 0, point: null }
  for (let i = Math.max(0, from); i < Math.min(geometry.length - 1, to); i += 1) {
    const candidate = closestPointOnSegment(point, geometry[i], geometry[i + 1])
    if (candidate.distance < best.distance) best = { ...candidate, segmentIndex: i }
  }
  return best
}

export function polylineDistance(points, startIndex = 0, endIndex = points.length - 1) {
  let total = 0
  for (let i = startIndex; i < Math.min(endIndex, points.length - 1); i += 1) total += haversine(points[i], points[i + 1])
  return total
}

export function smoothPosition(previous, current, factor = 0.35) {
  if (!isCoordinate(previous)) return current
  return { ...current, lat: previous.lat + (current.lat - previous.lat) * factor, lon: previous.lon + (current.lon - previous.lon) * factor }
}
