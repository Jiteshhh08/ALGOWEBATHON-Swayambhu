const SPECIALTY_POOL = ['cardiology', 'neurology', 'trauma', 'general', 'pediatrics', 'orthopedics']

export function generateDoctorsForHospital(hospital, seedRef) {
  // seedRef is { seed: number } so we can mutate deterministically
  const rand = () => {
    seedRef.seed = (seedRef.seed * 1664525 + 1013904223) % 4294967296
    return seedRef.seed / 4294967296
  }
  const count = 2 + Math.floor(rand() * 4) // 2-5 doctors per hospital
  const doctors = []
  for (let i = 0; i < count; i++) {
    const specialty = hospital.specialties[i % hospital.specialties.length] || SPECIALTY_POOL[Math.floor(rand() * SPECIALTY_POOL.length)]
    const shiftStart = Math.floor(rand() * 16) // 0-15
    const shiftEnd = (shiftStart + 8 + Math.floor(rand() * 4)) % 24 // 8-11h shift
    const onDuty = isOnShift(shiftStart, shiftEnd, 10) // simulate current hour = 10
    const available = onDuty && rand() > 0.15 // 85% of on-duty are available
    doctors.push({
      id: `${hospital.id}-DOC-${String(i + 1).padStart(2, '0')}`,
      name: `Dr. ${String.fromCharCode(65 + (i % 26))}. ${specialty.charAt(0).toUpperCase() + specialty.slice(1)}`,
      specialty,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      shiftStart,
      shiftEnd,
      onDuty,
      available, // onDuty && not busy
      patientLoad: Math.floor(rand() * 3),
    })
  }
  return doctors
}

export function isOnShift(shiftStart, shiftEnd, currentHour = new Date().getHours()) {
  if (shiftStart === shiftEnd) return true // 24h
  if (shiftStart < shiftEnd) return currentHour >= shiftStart && currentHour < shiftEnd
  // overnight wrap
  return currentHour >= shiftStart || currentHour < shiftEnd
}

export function isSpecialistAvailable(doctors, hospitalId, specialty, currentHour) {
  const hour = currentHour ?? new Date().getHours()
  return doctors.some(
    d => d.hospitalId === hospitalId && d.specialty === specialty && d.available && isOnShift(d.shiftStart, d.shiftEnd, hour)
  )
}

export function getHospitalAvailableSpecialties(doctors, hospitalId, currentHour) {
  const hour = currentHour ?? new Date().getHours()
  return [...new Set(
    doctors
      .filter(d => d.hospitalId === hospitalId && d.available && isOnShift(d.shiftStart, d.shiftEnd, hour))
      .map(d => d.specialty)
  )]
}

export function toggleDoctorAvailability(doctors, doctorId, currentHour) {
  return doctors.map(d => {
    if (d.id !== doctorId) return d
    // toggle available, but respect onDuty — if off duty, toggle forces off duty to on
    const hour = currentHour ?? new Date().getHours()
    const onShift = isOnShift(d.shiftStart, d.shiftEnd, hour)
    if (!onShift) {
      // bring on duty by adjusting shift to include current hour
      return { ...d, shiftStart: hour, shiftEnd: (hour + 8) % 24, onDuty: true, available: true }
    }
    return { ...d, available: !d.available }
  })
}

export function setDoctorShift(doctors, doctorId, shiftStart, shiftEnd) {
  const hour = new Date().getHours()
  return doctors.map(d => {
    if (d.id !== doctorId) return d
    const onDuty = isOnShift(shiftStart, shiftEnd, hour)
    return { ...d, shiftStart, shiftEnd, onDuty, available: onDuty ? d.available : false }
  })
}
