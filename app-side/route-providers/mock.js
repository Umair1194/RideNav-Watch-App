import { demoRoute } from '../../fixtures/demo-route.js'
export function getDemoRoute(mode = 'bike') { return Promise.resolve({ ...demoRoute, mode, routeId: `demo-${Date.now()}` }) }
