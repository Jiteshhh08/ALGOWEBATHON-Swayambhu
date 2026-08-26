import { MinHeap } from './heap.js'

export function dijkstra(graph, startId, endId) {
  if (!graph.getNode(startId) || !graph.getNode(endId)) {
    return { distance: Infinity, path: [], visited: 0, feasible: false, edges: [] }
  }
  if (startId === endId) {
    return { distance: 0, path: [startId], visited: 0, feasible: true, edges: [] }
  }

  const dist = new Map()
  const prev = new Map()
  const visited = new Set()

  for (const id of graph.nodes.keys()) dist.set(id, Infinity)
  dist.set(startId, 0)

  const heap = new MinHeap()
  heap.push(startId, 0)

  let visitedCount = 0

  while (!heap.isEmpty()) {
    const { key: u, priority: d } = heap.pop()
    if (visited.has(u)) continue
    visited.add(u)
    visitedCount++

    if (u === endId) break
    if (d > dist.get(u)) continue

    for (const edge of graph.getNeighbors(u)) {
      if (edge.currentTravelTime === Infinity) continue
      const v = edge.destination
      if (visited.has(v)) continue

      const alt = d + edge.currentTravelTime
      if (alt < dist.get(v)) {
        dist.set(v, alt)
        prev.set(v, { node: u, edgeId: edge.id.replace('_rev', '') })
        heap.push(v, alt)
      }
    }
  }

  const distance = dist.get(endId)
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
