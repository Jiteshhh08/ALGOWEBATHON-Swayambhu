export class Graph {
  constructor() {
    this.nodes = new Map()
    this.adj = new Map()
    this.edgeMap = new Map()
  }

  addNode(node) {
    if (!node.id) throw new Error('Node must have id')
    this.nodes.set(node.id, node)
    if (!this.adj.has(node.id)) this.adj.set(node.id, [])
  }

  addEdge(edge) {
    if (!edge.source || !edge.destination) throw new Error('Edge needs source/destination')
    this._updateEdgeTime(edge)
    this.edgeMap.set(edge.id, edge)

    if (!this.adj.has(edge.source)) this.adj.set(edge.source, [])
    if (!this.adj.has(edge.destination)) this.adj.set(edge.destination, [])

    this.adj.get(edge.source).push(edge)

    const reverse = { ...edge, id: edge.id + '_rev', source: edge.destination, destination: edge.source }
    this.adj.get(edge.destination).push(reverse)
  }

  getNode(id) {
    return this.nodes.get(id) || null
  }

  getNeighbors(id) {
    return this.adj.get(id) || []
  }

  getEdge(edgeId) {
    return this.edgeMap.get(edgeId) || null
  }

  updateEdge(edgeId, patch) {
    const edge = this.edgeMap.get(edgeId)
    if (!edge) return null
    if (patch.status) edge.status = patch.status
    if (patch.trafficMultiplier !== undefined) edge.trafficMultiplier = patch.trafficMultiplier
    this._updateEdgeTime(edge)

    const revId = edgeId + '_rev'
    for (const list of this.adj.values()) {
      for (const e of list) {
        if (e.id === revId) {
          e.status = edge.status
          e.trafficMultiplier = edge.trafficMultiplier
          e.currentTravelTime = edge.currentTravelTime
        }
      }
    }
    return edge
  }

  _updateEdgeTime(edge) {
    if (edge.status === 'CLOSED') {
      edge.currentTravelTime = Infinity
    } else {
      edge.currentTravelTime = edge.baseTravelTime * (edge.trafficMultiplier || 1)
    }
  }

  get nodeCount() {
    return this.nodes.size
  }

  get edgeCount() {
    return this.edgeMap.size
  }

  toStats() {
    return { nodes: this.nodeCount, edges: this.edgeCount }
  }
}
