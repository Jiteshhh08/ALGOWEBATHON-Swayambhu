/**
 * Graph — adjacency-list for rural road network
 * Scalable to 50k+ nodes, 200k+ edges. No matrix.
 *
 * Node: { id, name, lat, lng, type, region }
 * Edge: { id, source, destination, distance, baseTravelTime, currentTravelTime, status, trafficMultiplier }
 * Status: 'OPEN' | 'SLOW' | 'CLOSED'
 */

/**
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {string} name
 * @property {number} lat
 * @property {number} lng
 * @property {string} [type] - village | hospital | depot | etc
 * @property {string} [region]
 */

/**
 * @typedef {Object} GraphEdge
 * @property {string} id
 * @property {string} source
 * @property {string} destination
 * @property {number} distance - km
 * @property {number} baseTravelTime - minutes
 * @property {number} currentTravelTime - minutes (base * trafficMultiplier, Infinity if CLOSED)
 * @property {'OPEN'|'SLOW'|'CLOSED'} status
 * @property {number} trafficMultiplier - 1.0 normal, >1 slow
 */

export class Graph {
  constructor() {
    /** @type {Map<string, GraphNode>} */
    this.nodes = new Map()
    /** @type {Map<string, GraphEdge[]>} */
    this.adj = new Map()
    /** @type {Map<string, GraphEdge>} */
    this.edgeMap = new Map()
  }

  /** @param {GraphNode} node */
  addNode(node) {
    if (!node.id) throw new Error('Node must have id')
    this.nodes.set(node.id, node)
    if (!this.adj.has(node.id)) this.adj.set(node.id, [])
  }

  /**
   * Add undirected edge (adds both directions with same id)
   * @param {GraphEdge} edge
   */
  addEdge(edge) {
    if (!edge.source || !edge.destination) throw new Error('Edge needs source/destination')
    // normalize currentTravelTime on insert
    this._updateEdgeTime(edge)

    this.edgeMap.set(edge.id, edge)

    if (!this.adj.has(edge.source)) this.adj.set(edge.source, [])
    if (!this.adj.has(edge.destination)) this.adj.set(edge.destination, [])

    this.adj.get(edge.source).push(edge)

    // reverse edge for undirected graph (share same status/time but swapped source/dest)
    const reverse = { ...edge, id: edge.id + '_rev', source: edge.destination, destination: edge.source }
    this.adj.get(edge.destination).push(reverse)
  }

  /** @param {string} id */
  getNode(id) {
    return this.nodes.get(id) || null
  }

  /** @param {string} id */
  getNeighbors(id) {
    return this.adj.get(id) || []
  }

  /** @param {string} edgeId */
  getEdge(edgeId) {
    return this.edgeMap.get(edgeId) || null
  }

  /**
   * Update edge status and recalc currentTravelTime
   * @param {string} edgeId
   * @param {{ status?: 'OPEN'|'SLOW'|'CLOSED', trafficMultiplier?: number }} patch
   */
  updateEdge(edgeId, patch) {
    const edge = this.edgeMap.get(edgeId)
    if (!edge) return null
    if (patch.status) edge.status = patch.status
    if (patch.trafficMultiplier !== undefined) edge.trafficMultiplier = patch.trafficMultiplier
    this._updateEdgeTime(edge)

    // sync reverse edge
    const revId = edgeId + '_rev'
    // reverse edge is not in edgeMap but in adj list — find and sync
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

  /** @private */
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

  /** For debugging/benchmark */
  toStats() {
    return { nodes: this.nodeCount, edges: this.edgeCount }
  }
}
