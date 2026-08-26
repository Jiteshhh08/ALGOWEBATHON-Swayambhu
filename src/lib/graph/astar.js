import { MinHeap } from './heap.js'

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function aStar(graph, startId, endId, opts = {}) {
  const maxSpeedKmh = opts.maxSpeedKmh || 60
  const maxSpeedKmPerMin = maxSpeedKmh / 60

  const startNode = graph.getNode(startId)
  const endNode = graph.getNode(endId)
  if (!startNode || !endNode) {
    return { distance: Infinity, path: [], visited: 0, feasible: false, edges: [] }
  }
  if (startId === endId) {
    return { distance: 0, path: [startId], visited: 0, feasible: true, edges: [] }
  }

  const heuristic = (nodeId) => {
    const n = graph.getNode(nodeId)
    if (!n) return 0
    const km = haversineKm(n.lat, n.lng, endNode.lat, endNode.lng)
    return km / maxSpeedKmPerMin
  }

  const gScore = new Map()
  const fScore = new Map()
  const prev = new Map()
  const visited = new Set()

  for (const id of graph.nodes.keys()) {
    gScore.set(id, Infinity)
    fScore.set(id, Infinity)
  }
  gScore.set(startId, 0)
  fScore.set(startId, heuristic(startId))

  const heap = new MinHeap()
  heap.push(startId, fScore.get(startId))

  let visitedCount = 0

  while (!heap.isEmpty()) {
    const { key: u } = heap.pop()
    if (visited.has(u)) continue
    visited.add(u)
    visitedCount++

    if (u === endId) break

    const gU = gScore.get(u)
    for (const edge of graph.getNeighbors(u)) {
      if (edge.currentTravelTime === Infinity) continue
      const v = edge.destination
      if (visited.has(v)) continue

      const tentative = gU + edge.currentTravelTime
      if (tentative < gScore.get(v)) {
        prev.set(v, { node: u, edgeId: edge.id.replace('_rev', '') })
        gScore.set(v, tentative)
        const f = tentative + heuristic(v)
        fScore.set(v, f)
        heap.push(v, f)
      }
    }
  }

  const distance = gScore.get(endId)
  if (!isFinite(distance)) {
    return { distance: Infinity, path: [], visited: visitedCount, feasible: false, edges: [] }
  }

  const path = []
  const edges = []
  let cur = endId
  while (cur) {
    path.unshift(cur)
    const p = prev.get(cur)
    if (p) {
      edges.unshift(p.edgeId)
      cur = p.node
    } else break
  }

  return { distance, path, visited: visitedCount, feasible: true, edges }
}
