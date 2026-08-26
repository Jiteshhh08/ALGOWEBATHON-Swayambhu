import { rerouteAmbulance } from './reroute.js'

let eventCounter = 0

export function createSimulationEngine(graph) {
  const activeTrips = new Map()
  const eventLog = []

  function logEvent(type, detail) {
    const entry = {
      id: `evt-${++eventCounter}`,
      timestamp: Date.now(),
      type,
      ...detail,
    }
    eventLog.push(entry)
    return entry
  }

  function startTrip(ambulanceId, currentNodeId, destinationId, route, edges, eta) {
    activeTrips.set(ambulanceId, {
      ambulanceId,
      currentNodeId,
      destinationId,
      route,
      routeEdges: edges,
      eta,
    })
  }

  function completeTrip(ambulanceId) {
    activeTrips.delete(ambulanceId)
  }

  function handleRoadEvent(edgeId, newStatus, trafficMultiplier) {
    if (newStatus !== undefined) {
      graph.updateEdge(edgeId, { status: newStatus, trafficMultiplier: trafficMultiplier || undefined })
    }

    const reroutes = []
    for (const [ambId, trip] of activeTrips) {
      const result = rerouteAmbulance(graph, trip, edgeId)
      if (!result) continue

      if (result.feasible) {
        trip.route = result.newRoute
        trip.routeEdges = result.newEdges
        trip.eta = result.newEta
        trip.currentNodeId = result.currentNode
      } else {
        activeTrips.delete(ambId)
      }

      const entry = logEvent('ROUTE_RECALCULATED', {
        edgeId,
        edgeStatus: newStatus,
        ambulanceId: ambId,
        currentNode: result.currentNode,
        destination: result.destination,
        oldEta: result.oldEta,
        newEta: result.newEta,
        feasible: result.feasible,
        explanation: result.explanation,
      })

      reroutes.push({ ambulanceId: ambId, entry, trip: { ...trip } })
    }

    return reroutes
  }

  function handleEvent(event) {
    switch (event.type) {
      case 'ROAD_CLOSED':
        return handleRoadEvent(event.edgeId, 'CLOSED')

      case 'ROAD_SLOW':
        return handleRoadEvent(event.edgeId, 'SLOW', event.trafficMultiplier || 1.5)

      case 'ROAD_OPEN':
        return handleRoadEvent(event.edgeId, 'OPEN', 1)

      case 'START_TRIP': {
        startTrip(
          event.ambulanceId,
          event.currentNodeId,
          event.destinationId,
          event.route,
          event.edges,
          event.eta
        )
        return logEvent('TRIP_STARTED', {
          ambulanceId: event.ambulanceId,
          destination: event.destinationId,
          eta: event.eta,
        })
      }

      case 'COMPLETE_TRIP': {
        completeTrip(event.ambulanceId)
        return logEvent('TRIP_COMPLETED', {
          ambulanceId: event.ambulanceId,
        })
      }

      default:
        return logEvent('UNKNOWN_EVENT', { type: event.type })
    }
  }

  return {
    activeTrips,
    eventLog,
    handleEvent,
    startTrip,
    completeTrip,
    getActiveTrips: () => [...activeTrips.values()],
    getEventLog: () => [...eventLog],
  }
}
