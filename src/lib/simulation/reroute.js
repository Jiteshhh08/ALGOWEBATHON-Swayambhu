import { aStar } from '../graph/astar.js'

export function rerouteAmbulance(graph, activeTrip, changedEdgeId) {
  if (!activeTrip || !activeTrip.route || activeTrip.route.length === 0) return null

  const routeEdges = activeTrip.routeEdges || []
  const affected = routeEdges.includes(changedEdgeId)
  if (!affected) return null

  const currentNode = activeTrip.currentNodeId || activeTrip.route[0]
  const destination = activeTrip.destinationId
  const oldEta = activeTrip.eta

  const oldRoute = [...activeTrip.route]
  const oldEdges = [...routeEdges]

  const newResult = aStar(graph, currentNode, destination)

  if (!newResult.feasible) {
    return {
      needsReroute: true,
      feasible: false,
      oldRoute,
      oldEdges,
      oldEta,
      newRoute: [],
      newEdges: [],
      newEta: Infinity,
      currentNode,
      destination,
      explanation: `ROUTE BLOCKED — no alternative path from ${currentNode} to ${destination}`,
    }
  }

  return {
    needsReroute: true,
    feasible: true,
    oldRoute,
    oldEdges,
    oldEta,
    newRoute: newResult.path,
    newEdges: newResult.edges,
    newEta: newResult.distance,
    currentNode,
    destination,
    explanation: `ROUTE BLOCKED — Old ETA: ${oldEta.toFixed(1)}m → New ETA: ${newResult.distance.toFixed(1)}m (A* recalculation)`,
  }
}
