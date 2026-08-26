import { createRecord } from './decisionRecord.js'
import { dijkstra } from '../graph/dijkstra.js'
import { aStar } from '../graph/astar.js'

export function decideAmbulance(request, ambulances, graph, opts = {}) {
  const { selectAmbulance } = opts
  const res = selectAmbulance(request, ambulances, graph, opts)
  const alternatives = res.candidates.filter(c => !c.feasible || c.amb.id !== res.selected?.id).slice(0, 5).map(c => ({
    id: c.amb.id,
    reason: c.reason,
    feasible: c.feasible,
  }))
  const record = createRecord({
    requestId: request.id,
    decisionType: 'AMBULANCE_ASSIGNED',
    selected: res.selected ? { id: res.selected.id, location: res.selected.location, eta: res.candidates.find(c=>c.amb.id===res.selected.id)?.eta } : null,
    alternatives,
    reason: res.reason,
    algorithm: 'selectAmbulance (Dijkstra ETA)',
  })
  return { ...res, record }
}

export function decideHospital(request, hospitals, graph, opts = {}) {
  const { selectHospital } = opts
  const res = selectHospital(request, hospitals, graph)
  const alternatives = res.candidates.filter(c => c.hospital.id !== res.selected?.id).slice(0, 5).map(c => ({
    id: c.hospital.id,
    name: c.hospital.name,
    reason: c.reason,
    feasible: c.feasible,
    totalCost: c.totalCost,
  }))
  const record = createRecord({
    requestId: request.id,
    decisionType: 'HOSPITAL_SELECTED',
    selected: res.selected ? { id: res.selected.id, name: res.selected.name, cost: res.bestDetail?.totalCost, travel: res.bestDetail?.travelTime } : null,
    alternatives,
    reason: res.reason,
    algorithm: 'selectHospital (hard filter + totalCost)',
  })
  return { ...res, record }
}

export function decideRoute(graph, origin, target, mode = 'astar') {
  const t0 = performance.now()
  const res = mode === 'astar' ? aStar(graph, origin, target) : dijkstra(graph, origin, target)
  const t1 = performance.now()
  const record = createRecord({
    requestId: `${origin}->${target}`,
    decisionType: 'ROUTE_CALCULATED',
    selected: res.feasible ? { path: res.path, edges: res.edges, distance: res.distance, visited: res.visited } : null,
    alternatives: [],
    reason: res.feasible ? `Route ${res.distance.toFixed(1)}m via ${res.path.length} hops, visited ${res.visited}` : 'No route',
    algorithm: mode === 'astar' ? 'A*' : 'Dijkstra',
  })
  record.ms = (t1 - t0).toFixed(2)
  return { ...res, record }
}
