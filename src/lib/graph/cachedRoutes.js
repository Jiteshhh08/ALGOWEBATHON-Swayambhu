import { dijkstra } from './dijkstra.js'
import { aStar } from './astar.js'
import { getCached, setCached } from '../cache/routeCache.js'

export function cachedDijkstra(graph, a, b) {
  const c = getCached(a, b, 'dijkstra')
  if (c) return c
  const r = dijkstra(graph, a, b)
  setCached(a, b, 'dijkstra', r)
  return r
}

export function cachedAStar(graph, a, b, opts) {
  const c = getCached(a, b, 'astar')
  if (c) return c
  const r = aStar(graph, a, b, opts)
  setCached(a, b, 'astar', r)
  return r
}
