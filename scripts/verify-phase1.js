import { dijkstra } from '../src/lib/graph/dijkstra.js'
import { aStar } from '../src/lib/graph/astar.js'
import { generateGraph, generateTinyGraph } from '../src/data/seed.js'

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

console.log('=== Phase 1 Verification ===')

// Tiny graph correctness
const tiny = generateTinyGraph()
console.log('Tiny:', tiny.toStats())

const d1 = dijkstra(tiny, 'n0', 'n3')
console.log('Dijkstra n0->n3:', d1)
assert(d1.feasible && d1.path.join('->') === 'n0->n1->n2->n3', 'Dijkstra should take 3 hops (15m) not direct 20m')
assert(Math.abs(d1.distance - 15) < 0.01, 'distance 15')

const a1 = aStar(tiny, 'n0', 'n3')
console.log('A* n0->n3:', a1)
assert(a1.feasible && a1.distance === d1.distance, 'A* matches Dijkstra')

// Road closure -> reroute
tiny.updateEdge('e01', { status: 'CLOSED' })
const d2 = dijkstra(tiny, 'n0', 'n3')
console.log('After CLOSE e01:', d2)
assert(d2.path.includes('n3') && !d2.path.includes('n1') || d2.path.length > 0, 'should reroute via direct or fail')
assert(d2.distance === 20, 'rerouted to direct 20m')

// No route case
tiny.updateEdge('e03', { status: 'CLOSED' }) // also close direct
const d3 = dijkstra(tiny, 'n0', 'n3')
console.log('After closing both routes:', d3)
assert(!d3.feasible, 'should be infeasible')

console.log('✓ Tiny graph tests passed')

// Medium graph perf (500 nodes)
console.time('gen 500')
const g500 = generateGraph({ nodeCount: 500, edgePerNode: 4, seed: 1 })
console.timeEnd('gen 500')
console.log('500 stats:', g500.toStats())

const ids = [...g500.nodes.keys()]
const s = ids[0], t = ids[100]
console.time('dijkstra 500')
const r500 = dijkstra(g500, s, t)
console.timeEnd('dijkstra 500')
console.log('500 result:', { dist: r500.distance.toFixed(2), hops: r500.path.length, visited: r500.visited, feasible: r500.feasible })

console.time('astar 500')
const a500 = aStar(g500, s, t)
console.timeEnd('astar 500')
console.log('500 A*:', { dist: a500.distance.toFixed(2), hops: a500.path.length, visited: a500.visited, visitedLess: a500.visited <= r500.visited })

assert(r500.feasible, '500 should be feasible')
assert(a500.feasible && Math.abs(a500.distance - r500.distance) < 0.01, 'A* distance matches')

// Large graph stress (5k) — should still be <100ms typical
console.time('gen 5k')
const g5k = generateGraph({ nodeCount: 5000, edgePerNode: 4, seed: 2 })
console.timeEnd('gen 5k')
console.log('5k stats:', g5k.toStats())
const s5 = [...g5k.nodes.keys()][0]
const t5 = [...g5k.nodes.keys()][2500]
const t0 = performance.now()
const r5k = dijkstra(g5k, s5, t5)
const t1 = performance.now()
console.log(`dijkstra 5k: ${(t1 - t0).toFixed(1)}ms`, { feasible: r5k.feasible, hops: r5k.path.length, visited: r5k.visited })
const t2 = performance.now()
const a5k = aStar(g5k, s5, t5)
const t3 = performance.now()
console.log(`astar 5k: ${(t3 - t2).toFixed(1)}ms`, { feasible: a5k.feasible, visited: a5k.visited })

if (t1 - t0 > 200) console.warn('⚠ Dijkstra 5k >200ms — consider tuning')
else console.log('✓ Perf OK')

console.log('=== Phase 1 Complete ===')
