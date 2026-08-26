export function computeMetrics({ requests, hospitals, ambulances, routeStats, now = Date.now() }) {
  const totalReq = requests.length
  const avgWait = totalReq ? (requests.reduce((s, r) => s + (now - r.createdAt) / 60000, 0) / totalReq) : 0

  const crit = requests.filter(r => r.urgency === 'Critical')
  const avgCritWait = crit.length ? (crit.reduce((s, r) => s + (now - r.createdAt) / 60000, 0) / crit.length) : 0

  const hospUtil = hospitals.length ? hospitals.reduce((s, h) => s + (h.bedsTotal ? (h.bedsTotal - h.bedsAvailable) / h.bedsTotal : 0), 0) / hospitals.length : 0
  const icuUtil = hospitals.length ? hospitals.reduce((s, h) => s + (h.icuTotal ? (h.icuTotal - h.icuAvailable) / h.icuTotal : 0), 0) / hospitals.length : 0
  const ambUtil = ambulances.length ? ambulances.filter(a => a.status !== 'AVAILABLE').length / ambulances.length : 0

  const routingMs = routeStats ? Number(routeStats.dijkstra?.ms || 0) + Number(routeStats.astar?.ms || 0) : 0

  return {
    totalReq,
    avgWait: avgWait.toFixed(1),
    avgCritWait: avgCritWait.toFixed(1),
    hospUtil: (hospUtil * 100).toFixed(1),
    icuUtil: (icuUtil * 100).toFixed(1),
    ambUtil: (ambUtil * 100).toFixed(1),
    routingMs: routingMs.toFixed(2),
    queueLen: totalReq,
  }
}
