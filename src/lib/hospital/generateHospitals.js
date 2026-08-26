/**
 * Generate synthetic hospital capability data aligned with PRD 7.4 / 7.9 / 7.10
 * Attach to graph nodes of type 'hospital'
 */
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
    const bedsTotal = 20 + Math.floor(rand() * 80) // 20-100
    const bedsAvailable = Math.max(0, bedsTotal - Math.floor(rand() * bedsTotal * 0.9))
    const icuTotal = 4 + Math.floor(rand() * 12) // 4-16
    const icuAvailable = Math.max(0, icuTotal - Math.floor(rand() * icuTotal * 0.85))

    const specialtyCount = 2 + Math.floor(rand() * 3)
    const specialties = [...new Set(Array.from({ length: specialtyCount }, () => pick(specialtyPool)))]
    const equipCount = 3 + Math.floor(rand() * 3)
    const equipment = [...new Set(Array.from({ length: equipCount }, () => pick(equipmentPool)))]

    // ensure at least general is common
    if (!specialties.includes('general') && rand() > 0.3) specialties.push('general')

    const medicineStock = {}
    const medicineThresholds = {}
    for (const med of medicinePool) {
      const qty = Math.floor(rand() * 60) // 0-60
      medicineStock[med] = qty
      medicineThresholds[med] = { minimum: 15, critical: 5 }
    }
    // force some variation: make 20% hospitals low on a random med
    if (rand() < 0.3) {
      const lowMed = pick(medicinePool)
      medicineStock[lowMed] = Math.floor(rand() * 4)
    }

    const queueLength = Math.floor(rand() * 8) // 0-7
    const operatingStatus = rand() < 0.06 ? 'CLOSED' : 'OPEN'

    return {
      id: `H${String(idx + 1).padStart(2, '0')}`,
      name: node.name || `Hospital ${idx + 1}`,
      nodeId: node.id,
      lat: node.lat,
      lng: node.lng,
      bedsTotal,
      bedsAvailable,
      icuTotal,
      icuAvailable,
      specialties,
      equipment,
      operatingStatus,
      queueLength,
      medicineStock,
      medicineThresholds,
      region: node.region,
    }
  })

  return hospitals
}

/**
 * Helper to create a deterministic 3-hospital scenario for testing the "reject nearest" requirement
 * Nearest (H01) lacks required specialty, middle (H02) lacks ICU, farthest (H03) is feasible
 */
export function createDemoHospitals(nodeIds) {
  // nodeIds: [nearestNode, midNode, farNode]
  const [nA, nB, nC] = nodeIds
  return [
    {
      id: 'H01',
      name: 'District Hospital A (NEAREST)',
      nodeId: nA,
      lat: 19.0,
      lng: 74.5,
      bedsTotal: 50,
      bedsAvailable: 20,
      icuTotal: 8,
      icuAvailable: 3,
      specialties: ['general', 'orthopedics'],
      equipment: ['oxygen', 'xray', 'stretcher'],
      operatingStatus: 'OPEN',
      queueLength: 1,
      medicineStock: { epinephrine: 30, insulin: 20 },
      medicineThresholds: { epinephrine: { minimum: 15, critical: 5 } },
      region: 'region-0',
    },
    {
      id: 'H02',
      name: 'District Hospital B (MID)',
      nodeId: nB,
      lat: 19.02,
      lng: 74.52,
      bedsTotal: 50,
      bedsAvailable: 15,
      icuTotal: 6,
      icuAvailable: 0,
      specialties: ['cardiology', 'general'],
      equipment: ['oxygen', 'ventilator', 'defibrillator'],
      operatingStatus: 'OPEN',
      queueLength: 2,
      medicineStock: { epinephrine: 25, insulin: 20 },
      medicineThresholds: { epinephrine: { minimum: 15, critical: 5 } },
      region: 'region-0',
    },
    {
      id: 'H03',
      name: 'District Hospital C (FAR but feasible)',
      nodeId: nC,
      lat: 19.06,
      lng: 74.56,
      bedsTotal: 60,
      bedsAvailable: 30,
      icuTotal: 10,
      icuAvailable: 6,
      specialties: ['cardiology', 'trauma', 'general'],
      equipment: ['oxygen', 'ventilator', 'icu', 'defibrillator', 'xray'],
      operatingStatus: 'OPEN',
      queueLength: 0,
      medicineStock: { epinephrine: 50, insulin: 50 },
      medicineThresholds: { epinephrine: { minimum: 15, critical: 5 } },
      region: 'region-0',
    },
  ]
}
