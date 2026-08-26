/**
 * Ambulance state machine — JS
 * States: AVAILABLE, DISPATCHING, EN_ROUTE, AT_PATIENT, TRANSPORTING, COMPLETED, MAINTENANCE, UNAVAILABLE
 */

/** @type {Record<string, string[]>} */
export const ALLOWED_TRANSITIONS = {
  AVAILABLE: ['DISPATCHING', 'MAINTENANCE', 'UNAVAILABLE'],
  DISPATCHING: ['EN_ROUTE', 'AVAILABLE', 'UNAVAILABLE'],
  EN_ROUTE: ['AT_PATIENT', 'AVAILABLE', 'UNAVAILABLE'], // can abort
  AT_PATIENT: ['TRANSPORTING', 'COMPLETED', 'UNAVAILABLE'],
  TRANSPORTING: ['COMPLETED', 'UNAVAILABLE'],
  COMPLETED: ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE: ['AVAILABLE', 'UNAVAILABLE'],
  UNAVAILABLE: ['AVAILABLE', 'MAINTENANCE'],
}

/**
 * @typedef {Object} Ambulance
 * @property {string} id
 * @property {string} location - nodeId
 * @property {'AVAILABLE'|'DISPATCHING'|'EN_ROUTE'|'AT_PATIENT'|'TRANSPORTING'|'COMPLETED'|'MAINTENANCE'|'UNAVAILABLE'} status
 * @property {string[]} [equipment]
 * @property {string[]} [capabilities]
 * @property {string|null} [currentRequestId]
 * @property {number|null} [eta] - minutes
 * @property {string[]} [currentRoute]
 * @property {number|null} [availableAt]
 */

/**
 * Transition ambulance state with validation
 * @param {Ambulance} amb
 * @param {Ambulance['status']} next
 */
export function transition(amb, next) {
  const allowed = ALLOWED_TRANSITIONS[amb.status] || []
  if (!allowed.includes(next)) {
    throw new Error(`Invalid transition ${amb.status} -> ${next} for ${amb.id}`)
  }
  amb.status = next
  if (next === 'AVAILABLE') {
    amb.currentRequestId = null
    amb.eta = null
    amb.currentRoute = []
  }
  return amb
}

/**
 * Check if ambulance can handle request
 * @param {Ambulance} amb
 * @param {{ requiredEquipment?: string[], requiredCapabilities?: string[] }} req
 */
export function canHandle(amb, req) {
  if (amb.status !== 'AVAILABLE') return false
  if (req.requiredEquipment) {
    for (const eq of req.requiredEquipment) {
      if (!amb.equipment?.includes(eq)) return false
    }
  }
  if (req.requiredCapabilities) {
    for (const cap of req.requiredCapabilities) {
      if (!amb.capabilities?.includes(cap)) return false
    }
  }
  return true
}

/**
 * Generate mock ambulances for demo
 * @param {string[]} nodeIds
 * @param {number} count
 */
export function generateAmbulances(nodeIds, count = 8) {
  const ambulances = []
  for (let i = 0; i < count; i++) {
    const loc = nodeIds[Math.floor(Math.random() * nodeIds.length)]
    const isAvailable = Math.random() > 0.25
    ambulances.push({
      id: `AMB-${String(i + 1).padStart(2, '0')}`,
      location: loc,
      status: isAvailable ? 'AVAILABLE' : Math.random() > 0.5 ? 'EN_ROUTE' : 'MAINTENANCE',
      equipment: i % 3 === 0 ? ['ventilator', 'oxygen'] : ['oxygen', 'stretcher'],
      capabilities: i % 2 === 0 ? ['basic', 'cardiac'] : ['basic'],
      currentRequestId: null,
      eta: null,
      currentRoute: [],
      availableAt: null,
    })
  }
  return ambulances
}
