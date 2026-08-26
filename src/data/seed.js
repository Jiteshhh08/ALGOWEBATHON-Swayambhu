import { Graph } from '../lib/graph/graph.js'

export function generateGraph(opts = {}) {
  const nodeCount = opts.nodeCount || 500
  const edgePerNode = opts.edgePerNode || 4
  let seed = opts.seed || 42

  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const graph = new Graph()

  const centerLat = 19.0
  const centerLng = 74.5
  const spread = 1.5

  const hospitals = Math.max(3, Math.floor(nodeCount * 0.02))

  for (let i = 0; i < nodeCount; i++) {
    const isHospital = i < hospitals
    const lat = centerLat + (rand() - 0.5) * spread * 2
    const lng = centerLng + (rand() - 0.5) * spread * 2
    graph.addNode({
      id: `n${i}`,
      name: isHospital ? `Hospital ${i + 1}` : `Village ${i + 1}`,
      lat,
      lng,
      type: isHospital ? 'hospital' : 'village',
      region: `region-${Math.floor(rand() * 4)}`,
    })
  }

  const ids = [...graph.nodes.keys()]
  const distCache = new Map()

  function haversine(a, b) {
    const R = 6371
    const toRad = (d) => (d * Math.PI) / 180
    const dLat = toRad(b.lat - a.lat)
    const dLon = toRad(b.lng - a.lng)
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(s))
  }

  let edgeId = 0
  for (const id of ids) {
    const n = graph.getNode(id)
    const candidates = []
    const sampleSize = Math.min(nodeCount, 200)
    for (let s = 0; s < sampleSize; s++) {
      const oid = ids[Math.floor(rand() * nodeCount)]
      if (oid === id) continue
      const o = graph.getNode(oid)
      const key = id < oid ? `${id}-${oid}` : `${oid}-${id}`
      let d = distCache.get(key)
      if (d === undefined) {
        d = haversine(n, o)
        distCache.set(key, d)
      }
      candidates.push({ id: oid, d })
    }
    candidates.sort((a, b) => a.d - b.d)

    const connectCount = Math.floor(edgePerNode / 2) + Math.floor(rand() * 2)
    for (let k = 0; k < Math.min(connectCount, candidates.length); k++) {
      const target = candidates[k].id
      const exists = graph.getNeighbors(id).some((e) => e.destination === target)
      if (exists) continue
      const km = candidates[k].d
      const baseTime = Math.max(2, (km / 40) * 60)
      graph.addEdge({
        id: `e${edgeId++}`,
        source: id,
        destination: target,
        distance: km,
        baseTravelTime: baseTime,
        currentTravelTime: baseTime,
        status: rand() < 0.02 ? 'SLOW' : 'OPEN',
        trafficMultiplier: rand() < 0.02 ? 1.5 + rand() : 1,
      })
    }
  }

  return graph
}

export function generateTinyGraph() {
  const g = new Graph()
  const coords = [
    [19.0, 74.5],
    [19.02, 74.52],
    [19.04, 74.54],
    [19.06, 74.56],
  ]
  coords.forEach(([lat, lng], i) => g.addNode({ id: `n${i}`, name: `N${i}`, lat, lng, type: 'village' }))
  const add = (s, d, km, mins) =>
    g.addEdge({
      id: `e${s}${d}`,
      source: `n${s}`,
      destination: `n${d}`,
      distance: km,
      baseTravelTime: mins,
      currentTravelTime: mins,
      status: 'OPEN',
      trafficMultiplier: 1,
    })
  add(0, 1, 3, 5)
  add(1, 2, 3, 5)
  add(2, 3, 3, 5)
  add(0, 3, 9, 20)
  return g
}
