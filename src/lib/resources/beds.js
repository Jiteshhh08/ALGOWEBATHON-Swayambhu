export function canAdmit(hospital, requiresICU = false) {
  if (hospital.operatingStatus && hospital.operatingStatus !== 'OPEN') return { ok: false, reason: 'Facility closed' }
  if (requiresICU) {
    if ((hospital.icuAvailable ?? 0) <= 0) return { ok: false, reason: 'ICU full' }
  }
  if ((hospital.bedsAvailable ?? 0) <= 0) return { ok: false, reason: 'No beds' }
  return { ok: true }
}

export function admitPatient(hospital, requiresICU = false) {
  const check = canAdmit(hospital, requiresICU)
  if (!check.ok) return { hospital, admitted: false, reason: check.reason }
  const updated = { ...hospital }
  updated.bedsAvailable = Math.max(0, updated.bedsAvailable - 1)
  updated.bedsOccupied = (updated.bedsTotal - updated.bedsAvailable)
  if (requiresICU) {
    updated.icuAvailable = Math.max(0, updated.icuAvailable - 1)
    updated.icuOccupied = updated.icuTotal - updated.icuAvailable
  }
  // track occupancy derived
  return { hospital: updated, admitted: true }
}

export function dischargePatient(hospital, wasICU = false) {
  const updated = { ...hospital }
  updated.bedsAvailable = Math.min(updated.bedsTotal, (updated.bedsAvailable ?? 0) + 1)
  updated.bedsOccupied = updated.bedsTotal - updated.bedsAvailable
  if (wasICU) {
    updated.icuAvailable = Math.min(updated.icuTotal, (updated.icuAvailable ?? 0) + 1)
    updated.icuOccupied = updated.icuTotal - updated.icuAvailable
  }
  return { hospital: updated, discharged: true }
}

export function transferPatient(sourceHospital, destHospital, requiresICU = false) {
  const admit = admitPatient(destHospital, requiresICU)
  if (!admit.admitted) return { success: false, reason: admit.reason }
  const discharged = dischargePatient(sourceHospital, requiresICU)
  return { success: true, source: discharged.hospital, dest: admit.hospital }
}

export function occupancyRatio(hospital, type = 'beds') {
  if (type === 'icu') {
    if (!hospital.icuTotal) return 0
    return (hospital.icuTotal - (hospital.icuAvailable ?? 0)) / hospital.icuTotal
  }
  if (!hospital.bedsTotal) return 0
  return (hospital.bedsTotal - (hospital.bedsAvailable ?? 0)) / hospital.bedsTotal
}
