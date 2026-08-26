import { dijkstra } from '../graph/dijkstra.js'
import { selectHospital } from '../hospital/selectHospital.js'

function baselineSelect(request, hospitals, graph) {
  let best = null
  let bestDist = Infinity
  let bestRoute = null
  for (const h of hospitals) {
    const r = dijkstra(graph, request.originNode, h.nodeId)
    if (r.feasible && r.distance < bestDist) {
      bestDist = r.distance
      best = h
      bestRoute = r
    }
  }
  if (!best) return { selected: null, eta: Infinity, route: null, feasible: false }
  return { selected: best, eta: bestDist, route: bestRoute, feasible: true }
}

export function runBenchmark(requests, hospitals, graph) {
  let baseTotal = 0, smartTotal = 0
  let baseFail = 0, smartFail = 0
  let smartQueue = 0

  for (const req of requests) {
    const b = baselineSelect(req, hospitals, graph)
    if (b.feasible) baseTotal += b.eta
    else baseFail++
    // baseline queue penalty not applied

    const s = selectHospital(req, hospitals, graph)
    if (s.selected && s.bestDetail?.travelTime !== undefined) {
      smartTotal += s.bestDetail.travelTime
      smartQueue += s.bestDetail.breakdown.queueTime
    } else if (s.selected) {
      smartTotal += dijkstra(graph, req.originNode, s.selected.nodeId).distance
    } else {
      smartFail++
    }
  }

  const n = requests.length || 1
  const baseAvg = baseFail < n ? (baseTotal / (n - baseFail)).toFixed(1) : '—'
  const smartAvg = smartFail < n ? (smartTotal / (n - smartFail)).toFixed(1) : '—'

  const improvement = baseAvg !== '—' && smartAvg !== '—' ? ((Number(baseAvg) - Number(smartAvg)) / Number(baseAvg) * 100).toFixed(1) : '0'

  return {
    baseline: { avgEta: baseAvg, failed: baseFail, avgQueue: '0' },
    smart: { avgEta: smartAvg, failed: smartFail, avgQueue: (smartQueue / n).toFixed(1) },
    improvement: `${improvement}% faster`,
    note: 'Simulated — baseline = nearest, smart = feasibility + cost',
  }
}
