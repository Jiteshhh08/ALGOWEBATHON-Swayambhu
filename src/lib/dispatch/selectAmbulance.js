import { dijkstra } from '../graph/dijkstra.js'
import { canHandle } from './ambulance.js'

/**
 * Select best feasible ambulance for request
 * Steps: filter by status/capability -> estimate ETA via graph -> pick min cost
 *
 * @param {any} request - { id, originNode, urgency, requiredEquipment?, requiredCapabilities? }
 * @param {Array<any>} ambulances
 * @param {import('../graph/graph.js').Graph} graph
 * @param {{ crossRegion?: boolean }} [opts]
 * @returns {{ selected: any|null, candidates: Array<{amb:any, eta:number, feasible:boolean, reason:string}>, reason: string }}
 */
export function selectAmbulance(request, ambulances, graph, opts = {}) {
  const candidates = []
  let best = null
  let bestEta = Infinity

  for (const amb of ambulances) {
    // status check
    if (amb.status !== 'AVAILABLE') {
      candidates.push({ amb, eta: Infinity, feasible: false, reason: `Status ${amb.status}` })
      continue
    }
    // capability check
    if (!canHandle(amb, request)) {
      const missingEq = (request.requiredEquipment || []).filter((e) => !amb.equipment?.includes(e))
      const missingCap = (request.requiredCapabilities || []).filter((c) => !amb.capabilities?.includes(c))
      const reason = missingEq.length ? `Missing equipment: ${missingEq.join(',')}` : `Missing capability: ${missingCap.join(',')}`
      candidates.push({ amb, eta: Infinity, feasible: false, reason })
      continue
    }

    // ETA — use Dijkstra if graph has nodes, else fallback haversine
    let eta = Infinity
    try {
      const res = dijkstra(graph, amb.location, request.originNode)
      if (res.feasible) eta = res.distance
      else eta = Infinity
    } catch {
      eta = Infinity
    }

    const feasible = isFinite(eta)
    candidates.push({ amb, eta, feasible, reason: feasible ? `ETA ${eta.toFixed(1)}m` : 'No route' })

    if (feasible && eta < bestEta) {
      bestEta = eta
      best = amb
    }
  }

  // Cross-region fallback: if no local AVAILABLE, consider EN_ROUTE that will free soon
  if (!best && opts.crossRegion) {
    let backupEta = Infinity
    for (const amb of ambulances) {
      if (amb.status !== 'EN_ROUTE' && amb.status !== 'TRANSPORTING') continue
      // estimate as 15m (free time) + travel distance
      let eta = Infinity
      try {
        const res = dijkstra(graph, amb.location, request.originNode)
        if (res.feasible) eta = res.distance + 15
      } catch {}
      const feasible = isFinite(eta)
      // add or update candidate
      const existing = candidates.find((x) => x.amb.id === amb.id)
      if (existing) {
        existing.eta = eta
        existing.feasible = feasible
        existing.reason = feasible ? `Backup ETA ${eta.toFixed(1)}m (busy)` : 'No backup route'
      } else {
        candidates.push({ amb, eta, feasible, reason: feasible ? `Backup ETA ${eta.toFixed(1)}m (busy)` : 'No backup route' })
      }
      if (feasible && eta < backupEta) {
        backupEta = eta
        best = amb
        bestEta = eta
      }
    }
  }

  // sort candidates by eta for UI
  candidates.sort((a, b) => a.eta - b.eta)

  if (!best) {
    return { selected: null, candidates, reason: 'No feasible ambulance — all busy/missing capability or no route' }
  }
  return { selected: best, candidates, reason: `Selected ${best.id} — lowest feasible ETA ${bestEta.toFixed(1)}m` }
}
