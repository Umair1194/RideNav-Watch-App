import { THRESHOLDS } from './constants.js'
import { angleDifference, bearing, haversine, isCoordinate, nearestRoutePoint, polylineDistance, smoothPosition } from './geo.js'
import { validateRoute } from './route-model.js'

const PASSED_CONFIRMATIONS = 2
const OFF_ROUTE_CONFIRMATIONS = 3
const REROUTE_COOLDOWN_MS = 60000

export class NavigationEngine {
  constructor(route, options = {}) {
    const validation = validateRoute(route)
    if (!validation.valid) throw new Error(validation.error)
    this.route = route
    this.mode = options.mode || route.mode
    this.thresholds = THRESHOLDS[this.mode] || THRESHOLDS.bike
    this.units = options.units || 'metric'
    this.stepIndex = Math.max(0, Math.min(options.stepIndex || 0, route.steps.length - 1))
    this.lastPosition = options.lastPosition || null
    this.lastRawPosition = null
    this.lastUpdateAt = 0
    this.speed = 0
    this.offRouteSamples = 0
    this.passedSamples = 0
    this.lastRerouteAt = options.lastRerouteAt || 0
    this.alerted = new Set(options.alertFlags || [])
    this.completed = false
    this.travelledMeters = options.travelledMeters || 0
  }

  update(sample) {
    const now = sample.timestamp || Date.now()
    if (!isCoordinate(sample)) return { accepted: false, reason: 'invalid-coordinate' }
    if (Number.isFinite(sample.accuracy) && sample.accuracy > 80) return { accepted: false, reason: 'poor-accuracy' }
    if (now < this.lastUpdateAt - 1000 || now - this.lastUpdateAt > 120000 && this.lastUpdateAt) this.lastRawPosition = null
    if (this.lastRawPosition) {
      const elapsed = Math.max(1, (now - this.lastUpdateAt) / 1000)
      const moved = haversine(this.lastRawPosition, sample)
      if (moved / elapsed > 90) return { accepted: false, reason: 'impossible-speed' }
      this.speed = Number.isFinite(sample.speed) && sample.speed >= 0 ? sample.speed : moved / elapsed
      if (moved < 250) this.travelledMeters += moved
    }
    const position = smoothPosition(this.lastPosition, sample, this.lastPosition ? 0.45 : 1)
    this.lastRawPosition = sample
    this.lastPosition = position
    this.lastUpdateAt = now

    const step = this.route.steps[this.stepIndex]
    const searchStart = Math.max(0, (step.geometryStartIndex || 0) - 2)
    const searchEnd = Math.min(this.route.geometry.length - 1, (step.geometryEndIndex ?? this.route.geometry.length - 1) + 3)
    const nearest = nearestRoutePoint(position, this.route.geometry, searchStart, searchEnd)
    const distanceToManeuver = haversine(position, step.location)
    const adaptive = this.adaptiveThresholds()
    const events = []

    const rawNearest = nearestRoutePoint(sample, this.route.geometry, searchStart, searchEnd)
    if (rawNearest.distance <= adaptive.offRoute) this.offRouteSamples = 0
    else if (nearest.distance > adaptive.offRoute) this.offRouteSamples += 1
    const offRoute = this.offRouteSamples >= OFF_ROUTE_CONFIRMATIONS
    let shouldReroute = false
    if (offRoute && now - this.lastRerouteAt >= REROUTE_COOLDOWN_MS) {
      shouldReroute = true
      this.lastRerouteAt = now
      events.push({ type: 'reroute', distance: nearest.distance })
    }

    for (const [name, threshold] of [['early', adaptive.early], ['prepare', adaptive.prepare], ['final', adaptive.final]]) {
      const key = `${this.stepIndex}:${name}`
      if (distanceToManeuver <= threshold && !this.alerted.has(key)) {
        this.alerted.add(key)
        events.push({ type: 'alert', level: name, stepIndex: this.stepIndex })
      }
    }

    const passed = this.hasPassedManeuver(position, step, distanceToManeuver, adaptive.final)
    this.passedSamples = passed ? this.passedSamples + 1 : Math.max(0, this.passedSamples - 1)
    if (this.passedSamples >= PASSED_CONFIRMATIONS) {
      this.passedSamples = 0
      if (this.stepIndex < this.route.steps.length - 1) {
        this.stepIndex += 1
        events.push({ type: 'step', stepIndex: this.stepIndex })
      } else if (distanceToManeuver <= Math.max(25, adaptive.final * 2)) {
        this.completed = true
        events.push({ type: 'arrival' })
      }
    }

    return {
      accepted: true, position, stepIndex: this.stepIndex, step: this.route.steps[this.stepIndex],
      distanceToManeuver: this.completed ? 0 : haversine(position, this.route.steps[this.stepIndex].location),
      remainingDistance: this.remainingDistance(position), remainingDuration: this.remainingDuration(position),
      offRoute, shouldReroute, stationary: this.speed < adaptive.stationarySpeed, completed: this.completed, events
    }
  }

  adaptiveThresholds() {
    const extra = Math.min(120, Math.max(0, this.speed * 5))
    return { ...this.thresholds, early: this.thresholds.early + extra, prepare: this.thresholds.prepare + extra * 0.45, final: this.thresholds.final + extra * 0.15 }
  }

  hasPassedManeuver(position, step, distance, finalThreshold) {
    if (distance <= Math.max(8, finalThreshold * 0.5)) return true
    const nextIndex = Math.min(this.route.geometry.length - 1, (step.geometryEndIndex ?? 0) + 1)
    const nextPoint = this.route.geometry[nextIndex]
    if (!nextPoint || nextPoint === step.location || distance > finalThreshold * 2.5) return false
    const routeBearing = bearing(step.location, nextPoint)
    const fromTurnBearing = bearing(step.location, position)
    return angleDifference(routeBearing, fromTurnBearing) < 65
  }

  remainingDistance(position) {
    const step = this.route.steps[this.stepIndex]
    const start = Math.max(0, step.geometryStartIndex || 0)
    const nearest = nearestRoutePoint(position, this.route.geometry, start, this.route.geometry.length - 1)
    const segmentRemainder = nearest.point ? haversine(nearest.point, this.route.geometry[nearest.segmentIndex + 1]) : 0
    return Math.max(0, segmentRemainder + polylineDistance(this.route.geometry, nearest.segmentIndex + 1))
  }

  remainingDuration(position) {
    const remaining = this.remainingDistance(position)
    const total = this.route.distanceMeters || polylineDistance(this.route.geometry)
    return total > 0 ? (this.route.durationSeconds || 0) * remaining / total : 0
  }

  snapshot() {
    return { stepIndex: this.stepIndex, lastPosition: this.lastPosition, lastRerouteAt: this.lastRerouteAt,
      alertFlags: [...this.alerted], travelledMeters: this.travelledMeters }
  }
}
