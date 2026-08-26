import { dijkstra } from '../graph/dijkstra.js'
import { selectHospital } from '../hospital/selectHospital.js'

function isHardFeasible(h, req, doctors) {
  if (h.operatingStatus && h.operatingStatus !== 'OPEN') return { ok: false, reason: `Facility ${h.operatingStatus}` }
  const reqSpecs = req.requiredSpecialties || []
  if (reqSpecs.length) {
    if (doctors?.length) {
      const missing = reqSpecs.filter(s => {
        const hasDoc = doctors.some(d => d.hospitalId === h.id && d.specialty === s && d.available !== false)
        const hasSpec = (h.specialties || []).includes(s)
        return !hasDoc && !hasSpec
      })
      if (missing.length) return { ok: false, reason: `Missing specialist: ${missing.join(', ')}` }
    } else {
      const missing = reqSpecs.filter(s => !(h.specialties || []).includes(s))
      if (missing.length) return { ok: false, reason: `Missing specialist: ${missing.join(', ')}` }
    }
  }
  const reqEq = req.requiredEquipment || []
  if (reqEq.length) {
    const missingEq = reqEq.filter(e => !(h.equipment || []).includes(e))
    if (missingEq.length) return { ok: false, reason: `Missing equipment: ${missingEq.join(', ')}` }
  }
  if (req.requiresICU && (h.icuAvailable ?? 0) <= 0) return { ok: false, reason: 'ICU full' }
  if ((h.bedsAvailable ?? 0) <= 0) return { ok: false, reason: 'No beds' }
  const reqMeds = req.requiredMedicines || []
  for (const med of reqMeds) {
    const medId = typeof med === 'string' ? med : med.id
    const qty = h.medicineStock?.[medId] ?? 0
    if (qty <= 0) return { ok: false, reason: `Medicine out of stock: ${medId}` }
  }
  return { ok: true }
}

function baselineSelectMeasured(request, hospitals, graph, doctors) {
  let best = null
  let bestDist = Infinity
  let bestRoute = null
  let bestTime = 0
  for (const h of hospitals) {
    const t0 = performance.now()
    const r = dijkstra(graph, request.originNode, h.nodeId)
    const dt = performance.now() - t0
    bestTime += dt
    if (r.feasible && r.distance < bestDist) {
      bestDist = r.distance
      best = h
      bestRoute = r
    }
  }
  if (!best) return { selected: null, eta: Infinity, route: null, feasible: false, failedReason: 'No route to any hospital', routingMs: bestTime }
  // Baseline ignores capability, so check hard feasibility after picking nearest
  const check = isHardFeasible(best, request, doctors)
  if (!check.ok) {
    // In real operation this assignment would fail at hospital — counts as failed
    return { selected: best, eta: Infinity, route: bestRoute, feasible: false, failedReason: check.reason, routingMs: bestTime, nearestPick: best.name }
  }
  const queueTime = (best.queueLength || 0) * 4
  const eta = bestDist + queueTime
  return { selected: best, eta, travel: bestDist, queueTime, route: bestRoute, feasible: true, routingMs: bestTime }
}

export function runBenchmark(requests, hospitals, graph, doctors = []) {
  let baseTotal = 0, smartTotal = 0
  let baseQueue = 0, smartQueue = 0
  let baseFail = 0, smartFail = 0
  let baseRoutingTotal = 0, smartRoutingTotal = 0

  for (const req of requests) {
    const t0s = performance.now()
    const s = selectHospital(req, hospitals, graph, doctors)
    const smartDt = performance.now() - t0s
    smartRoutingTotal += smartDt

    if (s.selected && s.bestDetail) {
      const travel = s.bestDetail.travelTime ?? s.bestDetail.breakdown?.travel ?? 0
      const queue = s.bestDetail.breakdown?.queueTime ?? (s.selected.queueLength || 0) * 4
      smartTotal += travel + queue
      smartQueue += queue
    } else if (s.selected) {
      const r = dijkstra(graph, req.originNode, s.selected.nodeId)
      smartTotal += r.feasible ? r.distance + (s.selected.queueLength || 0) * 4 : Infinity
      if (!r.feasible) smartFail++
    } else {
      smartFail++
    }

    const b = baselineSelectMeasured(req, hospitals, graph, doctors)
    baseRoutingTotal += b.routingMs
    if (b.feasible) {
      baseTotal += b.eta
      baseQueue += b.queueTime || 0
    } else {
      baseFail++
    }
  }

  const n = requests.length || 1
  const baseSuccess = n - baseFail
  const smartSuccess = n - smartFail
  const baseAvg = baseSuccess > 0 ? (baseTotal / baseSuccess).toFixed(1) : '—'
  const smartAvg = smartSuccess > 0 ? (smartTotal / smartSuccess).toFixed(1) : '—'
  const baseAvgQ = baseSuccess > 0 ? (baseQueue / baseSuccess).toFixed(1) : '—'
  const smartAvgQ = smartSuccess > 0 ? (smartQueue / smartSuccess).toFixed(1) : '—'
  const avgRouteMs = ((baseRoutingTotal + smartRoutingTotal) / (n * 2 || 1)).toFixed(2)

  let improvement = '0'
  let improvementNote = 'no delta'
  if (baseAvg !== '—' && smartAvg !== '—') {
    const diff = Number(baseAvg) - Number(smartAvg)
    const pct = (diff / Number(baseAvg) * 100)
    improvement = `${pct >= 0 ? '' : ''}${pct.toFixed(1)}%`
    improvementNote = pct > 0 ? `${pct.toFixed(1)}% faster (smart)` : pct < 0 ? `${Math.abs(pct).toFixed(1)}% slower — nearest is shorter but ignores feasibility` : 'equal'
  }

  const baseFailPct = ((baseFail / n) * 100).toFixed(1)
  const smartFailPct = ((smartFail / n) * 100).toFixed(1)

  return {
    baseline: { avgEta: baseAvg, avgQueue: baseAvgQ, failed: baseFail, failedPct: baseFailPct, routingMs: (baseRoutingTotal / n).toFixed(2) },
    smart: { avgEta: smartAvg, avgQueue: smartAvgQ, failed: smartFail, failedPct: smartFailPct, routingMs: (smartRoutingTotal / n).toFixed(2) },
    avgRoutingMs: avgRouteMs,
    improvement,
    improvementNote,
    note: 'Measured on synthetic graph (synthetic villages/hospitals, Dijkstra + hard-constraint checks). Not real patient data.',
  }
}
