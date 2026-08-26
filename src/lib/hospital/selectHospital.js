import { dijkstra } from '../graph/dijkstra.js'
import { isSpecialistAvailable } from '../resources/doctors.js'

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function selectHospital(request, hospitals, graph, doctors = null) {
  const candidates = []
  const rejected = []

  const reqSpecs = request.requiredSpecialties || []
  const reqEq = request.requiredEquipment || []
  const reqMeds = request.requiredMedicines || []
  const requiresICU = !!request.requiresICU

  for (const h of hospitals) {
    let failReason = null

    if (h.operatingStatus && h.operatingStatus !== 'OPEN') {
      failReason = `Facility ${h.operatingStatus} — not operational`
    } else if (reqSpecs.length > 0) {
      if (doctors && doctors.length) {
        const missingDocs = reqSpecs.filter(s => !isSpecialistAvailable(doctors, h.id, s))
        if (missingDocs.length > 0) {
          const missingSpec = reqSpecs.filter((s) => !h.specialties?.includes(s))
          if (missingSpec.length > 0) failReason = `Missing specialist: ${missingSpec.join(', ')}`
          else failReason = null
        } else {
          const missing = reqSpecs.filter((s) => !h.specialties?.includes(s))
          if (missing.length > 0) failReason = `Missing specialist: ${missing.join(', ')}`
        }
      } else {
        const missing = reqSpecs.filter((s) => !h.specialties?.includes(s))
        if (missing.length > 0) failReason = `Missing specialist: ${missing.join(', ')}`
      }
    }

    if (!failReason && reqEq.length > 0) {
      const missingEq = reqEq.filter((e) => !h.equipment?.includes(e))
      if (missingEq.length > 0) failReason = `Missing equipment: ${missingEq.join(', ')}`
    }

    if (!failReason && requiresICU) {
      if ((h.icuAvailable ?? 0) <= 0) failReason = 'ICU full — no ICU bed available'
    }
    if (!failReason) {
      if ((h.bedsAvailable ?? 0) <= 0) failReason = 'No beds available'
    }

    if (!failReason && reqMeds.length > 0) {
      for (const med of reqMeds) {
        const medId = typeof med === 'string' ? med : med.id
        const qty = getMedicineQty(h, medId)
        if (qty <= 0) {
          failReason = `Medicine out of stock: ${medId}`
          break
        }
      }
    }

    if (failReason) {
      rejected.push({ hospital: h, feasible: false, reason: failReason, travelTime: Infinity, totalCost: Infinity, breakdown: null, route: null })
      candidates.push({ hospital: h, feasible: false, reason: failReason, travelTime: Infinity, totalCost: Infinity, breakdown: null, route: null })
      continue
    }

    let route = null
    let travelTime = Infinity
    try {
      route = dijkstra(graph, request.originNode, h.nodeId)
      if (route.feasible) travelTime = route.distance
    } catch {}
    if (!isFinite(travelTime)) {
      // Do NOT fabricate a straight-line route when graph is disconnected (ROAD_CLOSED).
      // Treat as infeasible so operator sees true outage; matches transferDecision.js behavior.
      const r = 'No road route to facility — graph disconnected (road closed / no path)'
      rejected.push({ hospital: h, feasible: false, reason: r, travelTime: Infinity, totalCost: Infinity, breakdown: null, route: null })
      candidates.push({ hospital: h, feasible: false, reason: r, travelTime: Infinity, totalCost: Infinity, breakdown: null, route: null })
      continue
    }

    const queueTime = (h.queueLength || 0) * 4
    let bedPenalty = 0
    if (h.bedsTotal > 0) {
      const ratio = h.bedsAvailable / h.bedsTotal
      if (ratio < 0.15) bedPenalty = 18
      else if (ratio < 0.3) bedPenalty = 10
      else if (ratio < 0.5) bedPenalty = 4
    }
    let icuPenalty = 0
    if (requiresICU && h.icuTotal > 0) {
      const r = h.icuAvailable / h.icuTotal
      if (r < 0.2) icuPenalty = 15
      else if (r < 0.5) icuPenalty = 6
    }

    let medicinePenalty = 0
    const medDetails = []
    for (const med of reqMeds) {
      const medId = typeof med === 'string' ? med : med.id
      const qty = getMedicineQty(h, medId)
      const thresholds = h.medicineThresholds?.[medId]
      if (thresholds) {
        if (qty <= thresholds.critical) {
          medicinePenalty += 14
          medDetails.push(`${medId} CRITICAL (${qty})`)
        } else if (qty <= thresholds.minimum) {
          medicinePenalty += 7
          medDetails.push(`${medId} LOW (${qty})`)
        }
      } else if (qty < 5) {
        medicinePenalty += 10
      }
    }

    const totalCost = travelTime + queueTime + bedPenalty + icuPenalty + medicinePenalty

    const breakdown = {
      travel: +travelTime.toFixed(1),
      queueTime,
      bedPenalty,
      icuPenalty,
      medicinePenalty,
      medDetails,
      total: +totalCost.toFixed(1),
    }

    const okReason = `Feasible — travel ${travelTime.toFixed(1)}m + queue ${queueTime}m` + (bedPenalty ? ` + bedPenalty ${bedPenalty}` : '') + (icuPenalty ? ` + icuPenalty ${icuPenalty}` : '') + (medicinePenalty ? ` + medPenalty ${medicinePenalty}` : '') + ` = ${totalCost.toFixed(1)}`

    candidates.push({
      hospital: h,
      feasible: true,
      reason: okReason,
      travelTime,
      totalCost,
      breakdown,
      route,
    })
  }

  candidates.sort((a, b) => {
    if (a.feasible && !b.feasible) return -1
    if (!a.feasible && b.feasible) return 1
    if (!a.feasible && !b.feasible) return a.reason.localeCompare(b.reason)
    return a.totalCost - b.totalCost
  })

  const feasible = candidates.filter((c) => c.feasible)
  if (feasible.length === 0) {
    return {
      selected: null,
      candidates,
      rejected,
      reason: 'No feasible hospital — all failed hard constraints or no route',
    }
  }

  const best = feasible[0]
  const nearestByTravel = [...feasible].sort((a, b) => a.travelTime - b.travelTime)[0]
  let explain = `Selected ${best.hospital.name} — lowest total cost ${best.totalCost.toFixed(1)} (travel ${best.travelTime.toFixed(1)}m)`
  if (nearestByTravel.hospital.id !== best.hospital.id) {
    explain += ` — nearest feasible ${nearestByTravel.hospital.name} (${nearestByTravel.travelTime.toFixed(1)}m) was not cheapest due to queue/penalties`
  }

  return {
    selected: best.hospital,
    candidates,
    rejected,
    bestDetail: best,
    reason: explain,
  }
}

function getMedicineQty(hospital, medId) {
  if (!hospital.medicineStock) return 0
  if (hospital.medicineStock instanceof Map) return hospital.medicineStock.get(medId) ?? 0
  return hospital.medicineStock[medId] ?? 0
}
