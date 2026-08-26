import { dijkstra } from '../graph/dijkstra.js'
import { canHandle } from './ambulance.js'

export function selectAmbulance(request, ambulances, graph, opts = {}) {
  const candidates = []
  let best = null
  let bestEta = Infinity

  for (const amb of ambulances) {
    if (amb.status !== 'AVAILABLE') {
      candidates.push({ amb, eta: Infinity, feasible: false, reason: `Status ${amb.status}` })
      continue
    }
    if (!canHandle(amb, request)) {
      const missingEq = (request.requiredEquipment || []).filter((e) => !amb.equipment?.includes(e))
      const missingCap = (request.requiredCapabilities || []).filter((c) => !amb.capabilities?.includes(c))
      const reason = missingEq.length ? `Missing equipment: ${missingEq.join(',')}` : `Missing capability: ${missingCap.join(',')}`
      candidates.push({ amb, eta: Infinity, feasible: false, reason })
      continue
    }

    let eta = Infinity
    try {
      const res = dijkstra(graph, amb.location, request.originNode)
      if (res.feasible) eta = res.distance
    } catch {}

    const feasible = isFinite(eta)
    candidates.push({ amb, eta, feasible, reason: feasible ? `ETA ${eta.toFixed(1)}m` : 'No route' })

    if (feasible && eta < bestEta) {
      bestEta = eta
      best = amb
    }
  }

  if (!best && opts.crossRegion) {
    let backupEta = Infinity
    for (const amb of ambulances) {
      if (amb.status !== 'EN_ROUTE' && amb.status !== 'TRANSPORTING') continue
      let eta = Infinity
      try {
        const res = dijkstra(graph, amb.location, request.originNode)
        if (res.feasible) eta = res.distance + 15
      } catch {}
      const feasible = isFinite(eta)
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

  candidates.sort((a, b) => a.eta - b.eta)

  if (!best) {
    return { selected: null, candidates, reason: 'No feasible ambulance — all busy/missing capability or no route' }
  }
  return { selected: best, candidates, reason: `Selected ${best.id} — lowest feasible ETA ${bestEta.toFixed(1)}m` }
}
