export function generateHospitals(graph, opts = {}) {
  let seed = opts.seed ?? 99
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]

  const specialtyPool = ['cardiology', 'neurology', 'trauma', 'general', 'pediatrics', 'orthopedics']
  const equipmentPool = ['ventilator', 'oxygen', 'xray', 'icu', 'defibrillator', 'stretcher']
  const medicinePool = ['epinephrine', 'insulin', 'saline', 'morphine', 'antibiotic']

  const hospitalNodes = [...graph.nodes.values()].filter((n) => n.type === 'hospital')
  const hospitals = hospitalNodes.map((node, idx) => {
    const bedsTotal = 20 + Math.floor(rand() * 80)
    const bedsAvailable = Math.max(0, bedsTotal - Math.floor(rand() * bedsTotal * 0.9))
    const icuTotal = 4 + Math.floor(rand() * 12)
    const icuAvailable = Math.max(0, icuTotal - Math.floor(rand() * icuTotal * 0.85))

    const specialtyCount = 2 + Math.floor(rand() * 3)
    const specialties = [...new Set(Array.from({ length: specialtyCount }, () => pick(specialtyPool)))]
    const equipCount = 3 + Math.floor(rand() * 3)
    const equipment = [...new Set(Array.from({ length: equipCount }, () => pick(equipmentPool)))]

    if (!specialties.includes('general') && rand() > 0.3) specialties.push('general')

    const medicineStock = {}
    const medicineThresholds = {}
    const medicineConsumption = {}
    for (const med of medicinePool) {
      const qty = Math.floor(rand() * 60)
      medicineStock[med] = qty
      medicineThresholds[med] = { minimum: 15, critical: 5 }
      medicineConsumption[med] = 1 + Math.floor(rand() * 6) + (rand() < 0.2 ? 6 : 0) // 1-6, 20% high 7-12
    }
    if (rand() < 0.3) {
      const lowMed = pick(medicinePool)
      medicineStock[lowMed] = Math.floor(rand() * 4)
    }
    // occasionally zero consumption (stable stock) for edge case testing
    if (rand() < 0.1) {
      const stableMed = pick(medicinePool)
      medicineConsumption[stableMed] = 0
    }

    const queueLength = Math.floor(rand() * 8)
    const operatingStatus = rand() < 0.06 ? 'CLOSED' : 'OPEN'

    return {
      id: `H${String(idx + 1).padStart(2, '0')}`,
      name: node.name || `Hospital ${idx + 1}`,
      nodeId: node.id,
      lat: node.lat,
      lng: node.lng,
      bedsTotal,
      bedsAvailable,
      bedsOccupied: bedsTotal - bedsAvailable,
      icuTotal,
      icuAvailable,
      icuOccupied: icuTotal - icuAvailable,
      specialties,
      equipment,
      operatingStatus,
      queueLength,
      medicineStock,
      medicineThresholds,
      medicineConsumption,
      region: node.region,
    }
  })

  if (hospitals.length > 0) {
    const h0 = hospitals[0]
    if (!h0.specialties.includes('cardiology')) h0.specialties.push('cardiology')
    if (!h0.specialties.includes('general')) h0.specialties.push('general')
    if (!h0.equipment.includes('ventilator')) h0.equipment.push('ventilator')
    if (!h0.equipment.includes('icu')) h0.equipment.push('icu')
    h0.operatingStatus = 'OPEN'
    h0.bedsAvailable = Math.max(h0.bedsAvailable, 10)
    h0.icuAvailable = Math.max(h0.icuAvailable, 2)
    for (const med of ['epinephrine', 'insulin']) {
      if ((h0.medicineStock[med] ?? 0) < 20) h0.medicineStock[med] = 30
    }
  }
  if (hospitals.length > 1 && !hospitals[1].specialties.includes('cardiology') && rand() < 0.7) {
    hospitals[1].specialties.push('cardiology')
    if (!hospitals[1].equipment.includes('ventilator')) hospitals[1].equipment.push('ventilator')
    hospitals[1].operatingStatus = 'OPEN'
  }

  return hospitals
}

export function createDemoHospitals(nodeIds, graph = null) {
  const [nA, nB, nC] = nodeIds
  const coord = (id, fallbackLat, fallbackLng) => {
    if (graph) {
      const n = graph.getNode(id)
      if (n) return [n.lat, n.lng]
    }
    return [fallbackLat, fallbackLng]
  }
  const [latA, lngA] = coord(nA, 19.0, 74.5)
  const [latB, lngB] = coord(nB, 19.02, 74.52)
  const [latC, lngC] = coord(nC, 19.06, 74.56)
  // Guard: if any id missing, demo would place hospital at undefined location and be invisible
  const safeIds = [nA, nB, nC].map((id, i) => id || `n-demo-${i}`)
  return [
    {
      id: 'H01',
      name: 'District Hospital A (NEAREST)',
      nodeId: safeIds[0],
      lat: latA,
      lng: lngA,
      bedsTotal: 50,
      bedsAvailable: 20,
      bedsOccupied: 30,
      icuTotal: 8,
      icuAvailable: 3,
      icuOccupied: 5,
      specialties: ['general', 'orthopedics'],
      equipment: ['oxygen', 'xray', 'stretcher'],
      operatingStatus: 'OPEN',
      queueLength: 1,
      medicineStock: { epinephrine: 30, insulin: 20 },
      medicineThresholds: { epinephrine: { minimum: 15, critical: 5 }, insulin: { minimum: 15, critical: 5 } },
      medicineConsumption: { epinephrine: 4, insulin: 3 },
      region: 'region-0',
    },
    {
      id: 'H02',
      name: 'District Hospital B (MID)',
      nodeId: safeIds[1],
      lat: latB,
      lng: lngB,
      bedsTotal: 50,
      bedsAvailable: 15,
      bedsOccupied: 35,
      icuTotal: 6,
      icuAvailable: 0,
      icuOccupied: 6,
      specialties: ['cardiology', 'general'],
      equipment: ['oxygen', 'ventilator', 'defibrillator'],
      operatingStatus: 'OPEN',
      queueLength: 2,
      medicineStock: { epinephrine: 25, insulin: 20 },
      medicineThresholds: { epinephrine: { minimum: 15, critical: 5 }, insulin: { minimum: 15, critical: 5 } },
      medicineConsumption: { epinephrine: 5, insulin: 2 },
      region: 'region-0',
    },
    {
      id: 'H03',
      name: 'District Hospital C (FAR but feasible)',
      nodeId: safeIds[2],
      lat: latC,
      lng: lngC,
      bedsTotal: 60,
      bedsAvailable: 30,
      bedsOccupied: 30,
      icuTotal: 10,
      icuAvailable: 6,
      icuOccupied: 4,
      specialties: ['cardiology', 'trauma', 'general'],
      equipment: ['oxygen', 'ventilator', 'icu', 'defibrillator', 'xray'],
      operatingStatus: 'OPEN',
      queueLength: 0,
      medicineStock: { epinephrine: 50, insulin: 50 },
      medicineThresholds: { epinephrine: { minimum: 15, critical: 5 }, insulin: { minimum: 15, critical: 5 } },
      medicineConsumption: { epinephrine: 3, insulin: 3 },
      region: 'region-0',
    },
  ]
}
