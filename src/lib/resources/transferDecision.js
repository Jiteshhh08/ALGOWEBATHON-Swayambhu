/**
 * Patient Transfer vs Medicine Delivery comparison — Phase 5.5
 * Uses existing graph routing (dijkstra). PRD 7.11 / 12.4
 */
import { dijkstra } from '../graph/dijkstra.js'
import { isSpecialistAvailable } from './doctors.js'

/**
 * @param {object} request - { originNode, requiredSpecialties, requiredMedicines, requiresICU, etc }
 * @param {Array} hospitals
 * @param {import('../graph/graph.js').Graph} graph
 * @param {Array} doctors
 * @returns {object} { transfer, delivery, recommendation, reason }
 */
export function compareTransferVsDelivery(request, hospitals, graph, doctors = []) {
  const requiredMeds = request.requiredMedicines || []
  const requiredSpecs = request.requiredSpecialties || []
  const requiresICU = !!request.requiresICU

  // ---- Option A: Patient Transfer ----
  // Find best feasible hospital via simple hard checks + travel
  let bestTransfer = null
  let bestTransferEta = Infinity
  let transferReason = 'No feasible hospital for transfer'

  for (const h of hospitals) {
    if (h.operatingStatus !== 'OPEN') continue
    // specialist check via doctors if available, else via specialties array
    let specOk = true
    for (const spec of requiredSpecs) {
      const hasDoctor = doctors.length
        ? isSpecialistAvailable(doctors, h.id, spec)
        : (h.specialties || []).includes(spec)
      if (!hasDoctor) { specOk = false; break }
    }
    if (!specOk) continue
    if (requiresICU && (h.icuAvailable ?? 0) <= 0) continue
    if ((h.bedsAvailable ?? 0) <= 0) continue
    // Check required equipment
    const reqEq = request.requiredEquipment || []
    if (reqEq.length && !reqEq.every(e => (h.equipment || []).includes(e))) continue
    // Medicine check — transfer target should have medicine OR we will deliver; but for transfer we need medicine present
    // If medicine not at target, transfer still invalid unless delivery alternative exists — we treat as not feasible for pure transfer.
    let hasMeds = true
    for (const med of requiredMeds) {
      const medId = typeof med === 'string' ? med : med.id
      const qty = h.medicineStock?.[medId] ?? 0
      if (qty <= 0) { hasMeds = false; break }
    }
    if (!hasMeds) continue

    const route = dijkstra(graph, request.originNode, h.nodeId)
    if (!route.feasible) continue
    if (route.distance < bestTransferEta) {
      bestTransferEta = route.distance
      bestTransfer = { hospital: h, eta: route.distance, route, feasible: true }
    }
  }

  if (bestTransfer) {
    transferReason = `Transfer to ${bestTransfer.hospital.name} — ETA ${bestTransfer.eta.toFixed(1)}m`
  } else {
    // Check why — no route vs no capability
    const anyOpen = hospitals.some(h => h.operatingStatus === 'OPEN')
    if (!anyOpen) transferReason = 'All hospitals closed'
    else transferReason = 'No hospital has required specialist/bed/medicine + route'
  }

  // ---- Option B: Medicine Delivery ----
  // Find nearest source hospital that HAS the required medicine(s) and can deliver to patient
  let bestDelivery = null
  let bestDeliveryEta = Infinity
  let deliveryReason = 'No medicine source'

  if (requiredMeds.length === 0) {
    deliveryReason = 'No medicine required — delivery not needed'
  } else {
    for (const med of requiredMeds) {
      const medId = typeof med === 'string' ? med : med.id
      for (const h of hospitals) {
        if (h.operatingStatus !== 'OPEN') continue
        const qty = h.medicineStock?.[medId] ?? 0
        if (qty <= 0) continue
        // Source can be any hospital with stock; we deliver from there to patient origin
        const route = dijkstra(graph, h.nodeId, request.originNode)
        if (!route.feasible) continue
        if (route.distance < bestDeliveryEta) {
          bestDeliveryEta = route.distance
          bestDelivery = { sourceHospital: h, medicineId: medId, eta: route.distance, route, feasible: true }
        }
      }
    }
    if (bestDelivery) {
      deliveryReason = `Deliver ${bestDelivery.medicineId} from ${bestDelivery.sourceHospital.name} — ETA ${bestDelivery.eta.toFixed(1)}m`
    } else {
      deliveryReason = 'No hospital has required medicine or no delivery route'
    }
  }

  // ---- Decision ----
  const transferFeasible = !!bestTransfer
  const deliveryFeasible = !!bestDelivery

  let recommendation = 'NONE'
  let reason = ''
  if (!transferFeasible && !deliveryFeasible) {
    recommendation = 'NONE'
    reason = 'Both options impossible — no feasible transfer hospital and no medicine source with route. Escalate to operator.'
  } else if (transferFeasible && !deliveryFeasible) {
    recommendation = 'TRANSFER'
    reason = 'Medicine delivery not feasible — transfer patient to capable facility.'
  } else if (!transferFeasible && deliveryFeasible) {
    recommendation = 'DELIVER'
    reason = 'Patient transfer not feasible — deliver medicine to patient is safer.'
  } else {
    // both feasible, compare ETA
    if (bestDeliveryEta + 2 < bestTransferEta) { // small bias: delivery slightly preferred if notably faster
      recommendation = 'DELIVER'
      reason = `Medicine can reach patient faster (${bestDeliveryEta.toFixed(1)}m) than transfer (${bestTransferEta.toFixed(1)}m).`
    } else if (bestTransferEta <= bestDeliveryEta) {
      recommendation = 'TRANSFER'
      reason = `Transfer is faster or equal (${bestTransferEta.toFixed(1)}m vs ${bestDeliveryEta.toFixed(1)}m) and destination has full capability.`
    } else {
      recommendation = 'DELIVER'
      reason = `Deliver medicine ETA ${bestDeliveryEta.toFixed(1)}m vs transfer ${bestTransferEta.toFixed(1)}m.`
    }
  }

  // Handle specialist/b ed edge: if transfer hospital lacks specialist but delivery source exists, prefer delivery already covered

  return {
    transfer: bestTransfer
      ? { feasible: true, eta: bestTransfer.eta, hospital: bestTransfer.hospital, route: bestTransfer.route, reason: transferReason }
      : { feasible: false, eta: Infinity, reason: transferReason },
    delivery: bestDelivery
      ? { feasible: true, eta: bestDelivery.eta, sourceHospital: bestDelivery.sourceHospital, medicineId: bestDelivery.medicineId, route: bestDelivery.route, reason: deliveryReason }
      : { feasible: false, eta: Infinity, reason: deliveryReason },
    recommendation,
    reason,
  }
}
