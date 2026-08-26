import { useState, useMemo, useEffect } from 'react'
import { generateGraph } from './data/seed.js'
import { generateAmbulances } from './lib/dispatch/ambulance.js'
import { EmergencyQueue } from './lib/dispatch/priorityQueue.js'
import { selectAmbulance } from './lib/dispatch/selectAmbulance.js'
import { generateHospitals, createDemoHospitals } from './lib/hospital/generateHospitals.js'
import { selectHospital } from './lib/hospital/selectHospital.js'
import { decideAmbulance, decideHospital, decideRoute } from './lib/decision/decisionEngine.js'
import { createEventLog } from './lib/decision/eventLog.js'

const SPECIALTIES = ['cardiology', 'neurology', 'trauma', 'general', 'pediatrics', 'orthopedics']
const EQUIP = ['ventilator', 'oxygen', 'xray', 'icu', 'defibrillator', 'stretcher']
const MEDS = ['epinephrine', 'insulin', 'saline', 'morphine', 'antibiotic']
const URGENCIES = ['Critical', 'High', 'Medium', 'Low']

/* ---------- tiny icon set (lucide-style strokes) to avoid extra dep ---------- */
function Icon({ d, size = 18, stroke = 1.7 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}
const ICONS = {
  mission: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  dispatch: 'M1 3h15v13H1z M16 8h4l3 6v3h-7V8z M5.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M16.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  facilities: 'M3 21h18 M3 7v14 M21 7v14 M6 7V3h12v4 M9 21v-6h6v6',
  resources: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M10 13H8 M16 17H8 M13 13h1',
  analytics: 'M3 3v18h18 M7 16l3-3 3 3 5-8',
  decisions: 'M9 12l2 2 4-4 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  simulation: 'M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83 M16.24 7.76l2.83-2.83 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7-6 9-6 9s-6-2-6-9z M13.73 21a2 2 0 0 1-3.46 0',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
}

function NavRail({ active, onChange }) {
  const items = [
    { id: 'mission', label: 'Mission', d: ICONS.mission },
    { id: 'dispatch', label: 'Dispatch', d: ICONS.dispatch },
    { id: 'facilities', label: 'Facilities', d: ICONS.facilities },
    { id: 'resources', label: 'Resources', d: ICONS.resources },
    { id: 'analytics', label: 'Analytics', d: ICONS.analytics },
    { id: 'decisions', label: 'Decisions', d: ICONS.decisions },
    { id: 'simulation', label: 'Simulation', d: ICONS.simulation },
  ]
  return (
    <nav className="w-[68px] shrink-0 bg-white border-r border-[#DCE7EC] flex flex-col items-center py-3 gap-1 sticky top-[60px] h-[calc(100vh-60px)] overflow-auto">
      {items.map(it => {
        const on = active === it.id
        return (
          <button key={it.id} onClick={() => onChange(it.id)} title={it.label}
            className={`w-[52px] flex flex-col items-center gap-1 py-2 rounded-[6px] border-l-2 transition-colors ${on ? 'bg-[#EAF7FC] text-[#1677A8] border-[#218FC2]' : 'text-[#6E858F] border-transparent hover:bg-[#F1F7F9] hover:text-[#285466]'}`}>
            <span className={on ? 'text-[#1677A8]' : 'text-[#58707B]'}><Icon d={it.d} size={18} /></span>
            <span className="text-[9px] font-semibold tracking-wide leading-none">{it.label.toUpperCase()}</span>
          </button>
        )
      })}
      <div className="mt-auto pt-4 flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#EAF7FC] border border-[#DCE7EC] flex items-center justify-center text-[11px] font-bold text-[#1677A8]">OP</div>
        <span className="text-[9px] font-semibold text-[#81949D]">OPERATOR</span>
      </div>
    </nav>
  )
}

export default function App() {
  const [graph] = useState(() => generateGraph({ nodeCount: 200, edgePerNode: 4, seed: 42 }))
  const [hospitals, setHospitals] = useState(() => generateHospitals(graph, { seed: 99 }))
  const [ambulances] = useState(() => {
    const ids = [...graph.nodes.keys()]
    return generateAmbulances(ids, 8)
  })
  const [queue] = useState(() => new EmergencyQueue())
  const [requests, setRequests] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [activeNav, setActiveNav] = useState('mission')
  const [simOpen, setSimOpen] = useState(false)

  const [form, setForm] = useState({
    originNode: '',
    urgency: 'Critical',
    requiredSpecialties: ['cardiology'],
    requiredEquipment: ['ventilator'],
    requiredMedicines: ['epinephrine'],
    requiresICU: true,
  })
  const [crossRegion, setCrossRegion] = useState(true)
  const [logs, setLogs] = useState([])
  const [decisions, setDecisions] = useState([])
  const [demoMode, setDemoMode] = useState(false)
  const [roadStatus, setRoadStatus] = useState({ id: '', status: 'CLOSED' })
  const [eventLog] = useState(() => createEventLog(50))

  const villageNodes = useMemo(() => [...graph.nodes.values()].filter(n => n.type === 'village').slice(0, 80), [graph])

  useEffect(() => {
    if (!form.originNode && villageNodes.length) setForm(f => ({ ...f, originNode: villageNodes[0].id }))
  }, [villageNodes, form.originNode])

  const selectedReq = requests.find(r => r.id === selectedId) || requests[0] || null
  const selection = useMemo(() => {
    if (!selectedReq) return null
    return selectHospital(selectedReq, hospitals, graph)
  }, [selectedReq, hospitals, graph])

  const ambSelection = useMemo(() => {
    if (!selectedReq) return null
    return selectAmbulance(selectedReq, ambulances, graph, { crossRegion })
  }, [selectedReq, ambulances, graph, crossRegion])

  const queueSorted = useMemo(() => queue.toSorted(), [requests, queue])

  const routeStats = useMemo(() => {
    if (!selectedReq || !selection?.selected) return null
    const target = selection.selected.nodeId
    const rD = decideRoute(graph, selectedReq.originNode, target, 'dijkstra')
    const rA = decideRoute(graph, selectedReq.originNode, target, 'astar')
    return { dijkstra: { ...rD, ms: rD.record.ms }, astar: { ...rA, ms: rA.record.ms } }
  }, [selectedReq, selection, graph])

  // KPI computations
  const bedsAvailable = hospitals.reduce((a, h) => a + h.bedsAvailable, 0)
  const bedsTotal = hospitals.reduce((a, h) => a + h.bedsTotal, 0)
  const criticalStock = hospitals.filter(h => Object.entries(h.medicineStock).some(([k, v]) => v <= h.medicineThresholds[k].critical)).length
  const ambAvailable = ambulances.filter(a => a.status === 'AVAILABLE').length
  const specialistCount = hospitals.reduce((a, h) => a + h.specialties.length, 0)

  const handleCreate = () => {
    const id = `R${String(requests.length + 1).padStart(3, '0')}`
    const req = {
      id,
      originNode: form.originNode,
      urgency: form.urgency,
      requiredSpecialties: [...form.requiredSpecialties],
      requiredEquipment: [...form.requiredEquipment],
      requiredMedicines: [...form.requiredMedicines],
      requiresICU: form.requiresICU,
      createdAt: Date.now(),
      status: 'QUEUED',
    }
    queue.insert(req)
    const newRequests = [...requests, req]
    setRequests(newRequests)
    setSelectedId(id)
    const ambRes = decideAmbulance(req, ambulances, graph, { selectAmbulance, crossRegion })
    const hospRes = decideHospital(req, hospitals, graph, { selectHospital })
    const node = graph.getNode(req.originNode)
    eventLog.push('EMERGENCY_CREATED', req.id, { urgency: req.urgency, origin: node?.name, specialties: req.requiredSpecialties })
    eventLog.push('AMBULANCE_ASSIGNED', req.id, ambRes.record)
    eventLog.push('HOSPITAL_SELECTED', req.id, hospRes.record)
    if (hospRes.selected) {
      const r = decideRoute(graph, req.originNode, hospRes.selected.nodeId, 'astar')
      eventLog.push('ROUTE_CALCULATED', req.id, r.record)
    }
    setDecisions(d => [hospRes.record, ambRes.record, ...d].slice(0, 30))
    setLogs(l => [
      { ts: new Date().toLocaleTimeString(), type: 'EMERGENCY_CREATED', msg: `${id} ${req.urgency} @ ${node?.name || req.originNode} — ${req.requiredSpecialties.join(',') || 'general'}${req.requiresICU ? ' + ICU' : ''}`, tone: 'info' },
      { ts: new Date().toLocaleTimeString(), type: ambRes.record.decisionType, msg: ambRes.record.reason + ` [${ambRes.record.algorithm}]`, tone: ambRes.selected ? 'success' : 'critical' },
      { ts: new Date().toLocaleTimeString(), type: hospRes.record.decisionType, msg: hospRes.record.reason + ` [${hospRes.record.algorithm}]`, tone: hospRes.selected ? 'success' : 'critical' },
      ...l,
    ])
  }

  const handleDemoScenario = () => {
    const origins = villageNodes[2]?.id || 'n5'
    const targetHospNodes = hospitals.slice(0, 3).map(h => h.nodeId)
    const demoHospitals = createDemoHospitals(targetHospNodes)
    const merged = [...demoHospitals, ...hospitals.slice(3)]
    setHospitals(merged)
    setDemoMode(true)
    const req = {
      id: `R${String(requests.length + 1).padStart(3, '0')}`,
      originNode: origins,
      urgency: 'Critical',
      requiredSpecialties: ['cardiology'],
      requiredEquipment: ['ventilator'],
      requiredMedicines: ['epinephrine'],
      requiresICU: true,
      createdAt: Date.now(),
      status: 'QUEUED',
    }
    queue.insert(req)
    setRequests(r => [...r, req])
    setSelectedId(req.id)
    setForm(f => ({ ...f, originNode: origins, urgency: 'Critical', requiredSpecialties: ['cardiology'], requiredEquipment: ['ventilator'], requiredMedicines: ['epinephrine'], requiresICU: true }))
    setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'DEMO', msg: `Demo: nearest lacks cardiology / mid ICU full — far feasible should win`, tone: 'warning' }, ...l])
  }

  const handleToggleHospital = (hid, patch) => {
    setHospitals(hs => hs.map(h => h.id === hid ? { ...h, ...patch } : h))
  }

  const handleRoadUpdate = () => {
    if (!roadStatus.id) return
    const edge = graph.getEdge(roadStatus.id)
    if (!edge) {
      setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'ROAD', msg: `Edge ${roadStatus.id} not found`, tone: 'critical' }, ...l])
      return
    }
    const old = edge.status
    graph.updateEdge(roadStatus.id, { status: roadStatus.status, trafficMultiplier: roadStatus.status === 'SLOW' ? 2.5 : 1 })
    const rec = { id: `DEC-${Date.now()}`, timestamp: Date.now(), requestId: roadStatus.id, decisionType: 'ROUTE_RECALCULATED', reason: `Edge ${roadStatus.id}: ${old} → ${roadStatus.status} — routes will recalc`, algorithm: 'A*' }
    eventLog.push('ROUTE_RECALCULATED', roadStatus.id, rec)
    setDecisions(d => [rec, ...d].slice(0, 30))
    setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'ROUTE_RECALCULATED', msg: `Edge ${roadStatus.id}: ${old} → ${roadStatus.status} [A*]`, tone: 'warning' }, ...l])
    setHospitals(h => [...h])
  }

  const handleReset = () => {
    const newH = generateHospitals(graph, { seed: Math.floor(Math.random() * 1000) })
    setHospitals(newH)
    setRequests([])
    setSelectedId(null)
    setLogs([])
    setDecisions([])
    eventLog.clear()
    setDemoMode(false)
    for (const r of [...queue.toSorted()]) queue.remove(r.id)
  }

  return (
    <div className="min-h-screen bg-[#F4F8FA] text-[#16313F] flex flex-col">
      {/* Header 60px */}
      <header className="h-[60px] shrink-0 bg-white border-b border-[#DCE7EC] sticky top-0 z-20">
        <div className="h-full px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="leading-tight">
              <div className="text-[13px] font-bold tracking-[0.12em] text-[#123B5D]">HEALTHCARE NETWORK</div>
              <div className="text-[11px] font-medium tracking-[0.08em] text-[#81949D]">COMMAND CENTER</div>
            </div>
            <div className="hidden md:flex items-center gap-2 ml-6 pl-6 border-l border-[#DCE7EC]">
              <div className="h-[36px] w-[160px] bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] flex items-center px-3 gap-2 overflow-hidden relative">
                <div className="absolute inset-0 overflow-hidden rounded-[6px] opacity-30">
                  <div className="h-full w-1/2 network-pulse" style={{ width: '50%' }} />
                </div>
                <span className="w-2 h-2 rounded-full bg-[#238B68] shrink-0" />
                <span className="text-[11px] font-semibold tracking-wide text-[#16313F]">LIVE NETWORK</span>
                <span className="ml-auto text-[11px] font-medium text-[#238B68] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#238B68] inline-block" /> Operational</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-3 mr-2">
              <span className="text-[11px] font-medium text-[#58707B]">{graph.nodeCount} nodes · {graph.edgeCount} edges</span>
              <span className="w-px h-4 bg-[#DCE7EC]" />
              <span className="text-[11px] font-medium text-[#58707B]">{hospitals.length} hospitals · {ambAvailable} ambulances</span>
            </div>
            <button onClick={() => setSimOpen(v => !v)} className={`hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-[5px] text-[13px] font-semibold border ${simOpen ? 'bg-[#123B5D] text-white border-[#123B5D]' : 'bg-white text-[#285466] border-[#C7D7DE] hover:bg-[#F8FBFC]'}`}>Simulation</button>
            <button className="w-9 h-9 rounded-[5px] border border-[#DCE7EC] bg-white flex items-center justify-center text-[#58707B] hover:bg-[#F8FBFC]"><Icon d={ICONS.bell} size={16} /></button>
            <div className="w-9 h-9 rounded-full bg-[#EAF7FC] border border-[#DCE7EC] flex items-center justify-center text-xs font-bold text-[#1677A8]">JD</div>
            <button onClick={handleReset} className="hidden sm:inline-flex h-9 px-3 items-center rounded-[5px] bg-[#1677A8] hover:bg-[#155A83] text-white text-[13px] font-semibold">Reset</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <NavRail active={activeNav} onChange={setActiveNav} />

        <main className="flex-1 min-w-0 bg-[#F4F8FA]">
          {/* KPI Strip */}
          <div className="mx-4 mt-4 bg-white border border-[#DCE7EC] rounded-[6px] shadow-[0_1px_2px_rgba(25,55,70,0.04)] flex overflow-x-auto">
            {[
              { label: 'Active emergencies', value: queueSorted.length, sub: `${requests.filter(r=>r.urgency==='Critical').length} critical` },
              { label: 'Ambulances', value: `${ambAvailable}/${ambulances.length}`, sub: 'available' },
              { label: 'Beds available', value: bedsAvailable, sub: `of ${bedsTotal}` },
              { label: 'Specialists', value: specialistCount, sub: 'across network' },
              { label: 'Critical stock', value: criticalStock, sub: 'hospitals low', tone: criticalStock > 0 ? 'text-[#D92D3A]' : 'text-[#238B68]' },
            ].map((k, i) => (
              <div key={k.label} className="flex-1 min-w-[140px] px-5 py-3 flex flex-col justify-center relative">
                {i !== 0 && <div className="absolute left-0 top-3 bottom-3 w-px bg-[#DCE7EC]" />}
                <div className="micro text-[#81949D]">{k.label}</div>
                <div className={`text-[22px] font-bold leading-none tracking-tight mt-1 tabular-nums ${k.tone || 'text-[#123B5D]'}`}>{k.value}</div>
                <div className="text-[11px] text-[#58707B] mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Mission Control grid */}
          <div className="mx-4 mt-4 grid grid-cols-12 gap-4">
            {/* LIVE MAP 8 cols */}
            <div className="col-span-12 xl:col-span-8">
              <div className="panel overflow-hidden">
                <div className="h-10 px-4 flex items-center justify-between border-b border-[#DCE7EC] bg-[#F8FBFC]">
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-bold tracking-[0.08em] text-[#123B5D]">LIVE MAP</span>
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#238B68] bg-[#EAF7F2] border border-[#C7D7DE] px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-[#238B68] animate-pulse" /> OPERATIONAL</span>
                    {selection?.selected && <span className="hidden md:inline-flex text-[11px] text-[#58707B]">{selectedReq?.id} → {selection.selected.name} · ETA {selection.bestDetail?.travelTime?.toFixed(1)}m</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#81949D] hidden sm:inline">Pale clinical map · healthcare network dominates</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1677A8] bg-[#EAF7FC] border border-[#DCE7EC] px-2 py-1 rounded-[5px]">A* · {routeStats ? `${routeStats.astar.ms}ms` : '—'}</span>
                  </div>
                </div>

                <div className="relative h-[360px] bg-[#F8FBFC] overflow-hidden">
                  {/* subtle grid */}
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#16313F 1px, transparent 1px), linear-gradient(90deg, #16313F 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                  <svg viewBox="0 0 200 120" className="w-full h-full relative">
                    {/* roads subtle */}
                    {[...graph.nodes.values()].slice(0, 400).map(n => (
                      <circle key={n.id} cx={((n.lng - 74.5 + 2) * 50)} cy={((19.8 - n.lat) * 80)} r={n.type === 'hospital' ? 0 : 0.6} fill="#DCE7EC" opacity={0.9} />
                    ))}
                    {/* village nodes */}
                    {[...graph.nodes.values()].slice(0, 400).filter(n => n.type !== 'hospital').slice(0, 200).map(n => (
                      <circle key={'v'+n.id} cx={((n.lng - 74.5 + 2) * 50)} cy={((19.8 - n.lat) * 80)} r={0.9} fill={n.id === selectedReq?.originNode ? '#D92D3A' : '#A7DCF0'} stroke={n.id === selectedReq?.originNode ? '#D92D3A' : '#72C2E3'} strokeWidth={n.id === selectedReq?.originNode ? 0.6 : 0.3} opacity={0.95} />
                    ))}
                    {/* hospitals */}
                    {hospitals.map(h => {
                      const n = graph.getNode(h.nodeId)
                      if (!n) return null
                      const isSel = selection?.selected?.id === h.id
                      const load = h.bedsAvailable / h.bedsTotal
                      const fill = load < 0.2 ? '#D92D3A' : load < 0.5 ? '#D88A16' : '#238B68'
                      return <g key={h.id}>
                        <circle cx={((n.lng - 74.5 + 2) * 50)} cy={((19.8 - n.lat) * 80)} r={isSel ? 3.2 : 2.2} fill={isSel ? '#1677A8' : fill} stroke="white" strokeWidth={0.7} />
                        {isSel && <circle cx={((n.lng - 74.5 + 2) * 50)} cy={((19.8 - n.lat) * 80)} r={5} fill="none" stroke="#1677A8" strokeWidth={0.4} opacity={0.35} />}
                      </g>
                    })}
                    {/* active route */}
                    {selection?.bestDetail?.route?.path?.length > 1 && (
                      <>
                        <polyline
                          fill="none"
                          stroke="#218FC2"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity={0.95}
                          points={selection.bestDetail.route.path.map(pid => {
                            const n = graph.getNode(pid)
                            return `${((n.lng - 74.5 + 2) * 50)},${((19.8 - n.lat) * 80)}`
                          }).join(' ')}
                        />
                        <polyline
                          fill="none"
                          stroke="white"
                          strokeWidth="0.7"
                          strokeDasharray="2 4"
                          className="route-pulse"
                          points={selection.bestDetail.route.path.map(pid => {
                            const n = graph.getNode(pid)
                            return `${((n.lng - 74.5 + 2) * 50)},${((19.8 - n.lat) * 80)}`
                          }).join(' ')}
                        />
                      </>
                    )}
                    {/* emergency pulse */}
                    {selectedReq && (() => {
                      const n = graph.getNode(selectedReq.originNode)
                      if (!n) return null
                      return <>
                        <circle cx={((n.lng - 74.5 + 2) * 50)} cy={((19.8 - n.lat) * 80)} r="3.8" fill="#D92D3A" className={selectedReq.urgency === 'Critical' ? 'pulse-dot' : ''} />
                        <circle cx={((n.lng - 74.5 + 2) * 50)} cy={((19.8 - n.lat) * 80)} r="1.6" fill="white" />
                      </>
                    })()}
                  </svg>

                  {/* legend */}
                  <div className="absolute bottom-3 left-3 bg-white border border-[#DCE7EC] rounded-[6px] px-3 py-2 flex items-center gap-4 text-[11px] shadow-[0_1px_2px_rgba(25,55,70,0.04)]">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#A7DCF0] border border-[#72C2E3]" /> Village</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#1677A8] border border-white shadow" /> Hospital</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D92D3A] pulse-dot" /> Critical</span>
                    <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] bg-[#218FC2] rounded" /> Route</span>
                  </div>
                  <div className="absolute top-3 right-3 bg-white border border-[#DCE7EC] rounded-[6px] px-2.5 py-1.5 text-[11px] leading-none shadow-sm">
                    <div className="font-semibold text-[#123B5D]">{selection?.selected ? 'ROUTE ACTIVE' : 'STANDBY'}</div>
                    <div className="text-[#81949D]">{selection?.bestDetail?.route ? `${selection.bestDetail.route.path.length} hops · ${selection.bestDetail.travelTime?.toFixed(1)}m` : 'Select emergency'}</div>
                  </div>
                </div>

                {/* route stats + map controls */}
                <div className="px-4 py-3 bg-white border-t border-[#DCE7EC] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2 text-xs">
                    <div className="px-3 py-2 bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] min-w-[140px]">
                      <div className="micro text-[#81949D]">Dijkstra</div>
                      <div className="text-[11px] text-[#58707B] mt-0.5">{routeStats ? (routeStats.dijkstra.feasible ? `${routeStats.dijkstra.distance.toFixed(1)} · ${routeStats.dijkstra.visited} visited · ${routeStats.dijkstra.ms}ms` : 'Infeasible') : '—'}</div>
                    </div>
                    <div className="px-3 py-2 bg-[#EAF7FC] border border-[#A7DCF0] rounded-[6px] min-w-[140px]">
                      <div className="micro text-[#1677A8]">A* (heuristic)</div>
                      <div className="text-[11px] text-[#123B5D] mt-0.5">{routeStats ? (routeStats.astar.feasible ? `${routeStats.astar.distance.toFixed(1)} · ${routeStats.astar.visited} visited · ${routeStats.astar.ms}ms ${routeStats.astar.visited <= routeStats.dijkstra.visited ? '✓' : ''}` : 'Infeasible') : '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#81949D] hidden lg:inline">Edges: {[...graph.edgeMap.keys()].slice(0, 5).join(', ')} …</span>
                    <input placeholder="edge id e.g. e12" value={roadStatus.id} onChange={e => setRoadStatus(s => ({ ...s, id: e.target.value }))} className="h-9 w-[150px] bg-white border border-[#C7D7DE] rounded-[5px] px-2 text-[13px] placeholder:text-[#A8B6BC] focus:outline-none focus:border-[#43A9D3] focus:shadow-[0_0_0_2px_#D4EFF9]" />
                    <select value={roadStatus.status} onChange={e => setRoadStatus(s => ({ ...s, status: e.target.value }))} className="h-9 bg-white border border-[#C7D7DE] rounded-[5px] px-2 text-[13px] focus:outline-none">
                      <option>CLOSED</option><option>SLOW</option><option>OPEN</option>
                    </select>
                    <button onClick={handleRoadUpdate} className="h-9 px-3 bg-white border border-[#C7D7DE] rounded-[5px] text-[13px] font-semibold text-[#285466] hover:bg-[#F8FBFC]">Apply</button>
                  </div>
                </div>
              </div>

              {/* Create Emergency — compact clinical form */}
              <div className="panel mt-4 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">CREATE EMERGENCY</h3>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${form.urgency === 'Critical' ? 'bg-[#FDECEE] text-[#D92D3A] border-[#FDECEE]' : form.urgency === 'High' ? 'bg-[#FFF5E5] text-[#D88A16] border-[#FFF5E5]' : 'bg-[#EAF7FC] text-[#1677A8] border-[#EAF7FC]'}`}>{form.urgency.toUpperCase()}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="micro text-[#81949D]">Village / Origin</span>
                    <select value={form.originNode} onChange={e => setForm({ ...form, originNode: e.target.value })} className="mt-1 w-full h-9 bg-white border border-[#C7D7DE] rounded-[5px] px-2 text-[13px] focus:outline-none focus:border-[#43A9D3] focus:shadow-[0_0_0_2px_#D4EFF9]">
                      {villageNodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.id})</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="micro text-[#81949D]">Urgency</span>
                    <select value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value })} className="mt-1 w-full h-9 bg-white border border-[#C7D7DE] rounded-[5px] px-2 text-[13px] focus:outline-none focus:border-[#43A9D3]">
                      {URGENCIES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-3">
                  <div className="micro text-[#81949D] mb-1">Required Specialties</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SPECIALTIES.map(s => {
                      const on = form.requiredSpecialties.includes(s)
                      return <button key={s} onClick={() => setForm(f => ({ ...f, requiredSpecialties: on ? f.requiredSpecialties.filter(x => x !== s) : [...f.requiredSpecialties, s] }))} className={`px-2.5 py-1 rounded-full text-[12px] font-medium border ${on ? 'bg-[#EAF7FC] border-[#A7DCF0] text-[#1677A8]' : 'bg-white border-[#DCE7EC] text-[#58707B] hover:bg-[#F8FBFC]'}`}>{s}</button>
                    })}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="micro text-[#81949D] mb-1">Required Equipment</div>
                  <div className="flex flex-wrap gap-1.5">
                    {EQUIP.map(s => {
                      const on = form.requiredEquipment.includes(s)
                      return <button key={s} onClick={() => setForm(f => ({ ...f, requiredEquipment: on ? f.requiredEquipment.filter(x => x !== s) : [...f.requiredEquipment, s] }))} className={`px-2.5 py-1 rounded-full text-[12px] font-medium border ${on ? 'bg-[#EAF7F2] border-[#A7DCF0] text-[#238B68]' : 'bg-white border-[#DCE7EC] text-[#58707B] hover:bg-[#F8FBFC]'}`}>{s}</button>
                    })}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="micro text-[#81949D] mb-1">Required Medicines</div>
                  <div className="flex flex-wrap gap-1.5">
                    {MEDS.map(s => {
                      const on = form.requiredMedicines.includes(s)
                      return <button key={s} onClick={() => setForm(f => ({ ...f, requiredMedicines: on ? f.requiredMedicines.filter(x => x !== s) : [...f.requiredMedicines, s] }))} className={`px-2.5 py-1 rounded-full text-[12px] font-medium border ${on ? 'bg-[#FFF5E5] border-[#FDECEE] text-[#8A5A00]' : 'bg-white border-[#DCE7EC] text-[#58707B]'}`}>{s}</button>
                    })}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-[13px] text-[#285466]"><input type="checkbox" checked={form.requiresICU} onChange={e => setForm({ ...form, requiresICU: e.target.checked })} className="accent-[#1677A8]" /> Requires ICU</label>
                  <label className="inline-flex items-center gap-2 text-[13px] text-[#285466]"><input type="checkbox" checked={crossRegion} onChange={e => setCrossRegion(e.target.checked)} className="accent-[#1677A8]" /> Cross-region fallback</label>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={handleCreate} className="flex-1 h-10 bg-[#1677A8] hover:bg-[#155A83] text-white rounded-[5px] text-[13px] font-semibold">+ Add Emergency & Dispatch</button>
                  <button onClick={handleDemoScenario} className="px-4 h-10 bg-white border border-[#C7D7DE] text-[#285466] rounded-[5px] text-[13px] font-semibold hover:bg-[#F8FBFC]">★ Demo: Reject Nearest</button>
                </div>
                {demoMode && <p className="mt-2 text-[11px] text-[#8A5A00] bg-[#FFF5E5] border border-[#FFE5B4] rounded-[5px] px-2 py-1">Demo hospitals injected: nearest lacks cardiology · mid ICU full — far feasible should win.</p>}
              </div>
            </div>

            {/* RIGHT STATUS 4 cols */}
            <div className="col-span-12 xl:col-span-4 space-y-4">
              {/* Network health */}
              <div className="panel p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">NETWORK HEALTH</h3>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#238B68] bg-[#EAF7F2] border border-[#DCE7EC] px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-[#238B68]" /> OPERATIONAL</span>
                </div>
                <div className="mt-3 space-y-3">
                  {[
                    { label: 'Roads', value: 98, color: '#238B68' },
                    { label: 'Ambulances', value: Math.round((ambAvailable / ambulances.length) * 100), color: '#218FC2' },
                    { label: 'Facilities', value: Math.round(hospitals.filter(h => h.operatingStatus === 'OPEN').length / hospitals.length * 100), color: '#1677A8' },
                    { label: 'Medicine', value: Math.round((1 - criticalStock / Math.max(1, hospitals.length)) * 100), color: '#D88A16' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-3">
                      <span className="text-[11px] font-medium text-[#58707B] w-[78px]">{r.label}</span>
                      <div className="flex-1 h-1.5 bg-[#F4F8FA] border border-[#DCE7EC] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${r.value}%`, background: r.color }} />
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums text-[#16313F] w-9 text-right">{r.value}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] py-2">
                    <div className="micro text-[#81949D]">Beds</div>
                    <div className="text-[14px] font-bold text-[#123B5D]">{bedsAvailable}<span className="font-normal text-[#81949D]">/{bedsTotal}</span></div>
                  </div>
                  <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] py-2">
                    <div className="micro text-[#81949D]">Queue</div>
                    <div className="text-[14px] font-bold text-[#123B5D]">{queueSorted.length}</div>
                  </div>
                </div>
              </div>

              {/* Decision panel 360-420px spec */}
              <div className="panel p-4">
                <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">DECISION PANEL</h3>
                {!selectedReq ? (
                  <div className="mt-3 py-10 text-center border border-dashed border-[#DCE7EC] rounded-[6px] bg-[#F8FBFC]">
                    <div className="text-[12px] font-semibold text-[#81949D]">NO SELECTION</div>
                    <div className="text-[11px] text-[#A8B6BC] mt-1">Select a request to inspect reasoning</div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[13px] font-bold text-[#123B5D]">REQUEST {selectedReq.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${selectedReq.urgency === 'Critical' ? 'bg-[#FDECEE] text-[#D92D3A] border-[#FDECEE] pulse-dot' : 'bg-[#FFF5E5] text-[#8A5A00] border-[#FFF5E5]'}`}>{selectedReq.urgency.toUpperCase()}</span>
                    </div>
                    <div className="text-[13px] font-semibold text-[#16313F]">{selectedReq.urgency} · {graph.getNode(selectedReq.originNode)?.name}</div>
                    <div className="text-[11px] text-[#58707B]">{selectedReq.requiredSpecialties.join(', ') || 'general'} {selectedReq.requiresICU ? '· ICU' : ''} · {selectedReq.requiredMedicines.join(', ')}</div>
                    <div className="h-px bg-[#DCE7EC]" />

                    <div>
                      <div className="micro text-[#81949D]">Ambulance</div>
                      {ambSelection?.selected ? (
                        <div className="mt-1 flex items-center justify-between bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] px-3 py-2">
                          <span className="text-[13px] font-semibold text-[#123B5D]">{ambSelection.selected.id}</span>
                          <span className="text-[11px] font-medium text-[#238B68] bg-[#EAF7F2] border border-[#DCE7EC] px-2 py-0.5 rounded-full">ETA {ambSelection.candidates.find(c => c.amb.id === ambSelection.selected.id)?.eta ?? '—'}m</span>
                        </div>
                      ) : <div className="text-[11px] text-[#D92D3A] mt-1">{ambSelection?.reason || 'No feasible ambulance'}</div>}
                      <div className="text-[11px] text-[#58707B] mt-1">{ambSelection?.reason}</div>
                    </div>

                    <div className="h-px bg-[#DCE7EC]" />
                    <div>
                      <div className="micro text-[#81949D]">Destination</div>
                      {selection?.selected ? (
                        <div className="mt-1 bg-[#EAF7FC] border border-[#A7DCF0] rounded-[6px] px-3 py-2">
                          <div className="text-[13px] font-semibold text-[#123B5D]">{selection.selected.name}</div>
                          <div className="text-[11px] text-[#58707B]">{selection.selected.id} · {selection.selected.nodeId}</div>
                        </div>
                      ) : <div className="mt-1 text-[11px] text-[#D92D3A] bg-[#FDECEE] border border-[#FDECEE] rounded-[6px] px-3 py-2">{selection?.reason || 'No feasible facility'}</div>}
                    </div>

                    {selection?.bestDetail?.breakdown && (
                      <>
                        <div className="h-px bg-[#DCE7EC]" />
                        <div>
                          <div className="micro text-[#81949D]">Why this decision?</div>
                          <div className="mt-1 space-y-1 text-[11px]">
                            <div className="flex justify-between bg-white border border-[#DCE7EC] rounded-[5px] px-2 py-1"><span className="text-[#58707B]">Travel time</span><span className="font-semibold">{selection.bestDetail.breakdown.travel}m</span></div>
                            <div className="flex justify-between bg-white border border-[#DCE7EC] rounded-[5px] px-2 py-1"><span className="text-[#58707B]">Queue time</span><span className="font-semibold">{selection.bestDetail.breakdown.queueTime}m</span></div>
                            <div className="flex justify-between bg-white border border-[#DCE7EC] rounded-[5px] px-2 py-1"><span className="text-[#58707B]">Bed / ICU penalty</span><span className="font-semibold">{selection.bestDetail.breakdown.bedPenalty} / {selection.bestDetail.breakdown.icuPenalty}</span></div>
                            <div className="flex justify-between bg-white border border-[#DCE7EC] rounded-[5px] px-2 py-1"><span className="text-[#58707B]">Medicine penalty</span><span className="font-semibold">{selection.bestDetail.breakdown.medicinePenalty}</span></div>
                            <div className="flex justify-between bg-[#123B5D] text-white rounded-[5px] px-2 py-1.5"><span>Total expected response</span><span className="font-bold">{selection.bestDetail.breakdown.total}</span></div>
                          </div>
                          <div className="mt-2 text-[11px] text-[#81949D]">Route: <span className="font-mono text-[#58707B]">{selection.bestDetail.route?.path?.slice(0, 6).join(' → ')}{selection.bestDetail.route?.path?.length > 6 ? ' …' : ''}</span></div>
                        </div>
                      </>
                    )}

                    {selection?.rejected?.length > 0 && (
                      <>
                        <div className="h-px bg-[#DCE7EC]" />
                        <div>
                          <div className="micro text-[#D92D3A]">Alternatives rejected</div>
                          <div className="mt-1 space-y-1">
                            {selection.rejected.map(r => (
                              <div key={r.hospital.id} className="flex justify-between items-center px-2 py-1 bg-[#FDECEE] border border-[#FDECEE] rounded-[5px] text-[11px]">
                                <span className="font-medium text-[#16313F]">{r.hospital.name}</span>
                                <span className="text-[#D92D3A]">{r.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Ambulance candidates compact */}
              <div className="panel p-4">
                <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">AMBULANCE CANDIDATES</h3>
                {!selectedReq ? <p className="text-[11px] text-[#81949D] mt-2">Select a request</p> : (
                  <div className="mt-2 space-y-1 max-h-[160px] overflow-auto pr-1">
                    {ambSelection?.candidates.slice(0, 8).map(c => (
                      <div key={c.amb.id} className={`flex justify-between items-center px-2 py-1.5 rounded-[5px] border text-[11px] ${c.feasible ? 'bg-white border-[#DCE7EC] text-[#16313F]' : 'bg-[#FDECEE] border-[#FDECEE] text-[#D92D3A]'}`}>
                        <span className="font-mono font-semibold">{c.amb.id} <span className="font-normal text-[#81949D]">({c.amb.location})</span></span>
                        <span className="truncate ml-2 text-right">{c.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom: Critical Queue + Event Stream */}
          <div className="mx-4 mt-4 grid grid-cols-12 gap-4 pb-6">
            <div className="col-span-12 xl:col-span-7">
              <div className="panel overflow-hidden">
                <div className="h-10 px-4 flex items-center justify-between border-b border-[#DCE7EC] bg-white">
                  <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">CRITICAL QUEUE <span className="ml-2 text-[11px] font-normal text-[#81949D]">({queueSorted.length})</span></h3>
                  <span className="text-[11px] text-[#81949D]">Wait time increases priority · anti-starvation</span>
                </div>
                {queueSorted.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="text-[12px] font-semibold tracking-wide text-[#81949D]">NO ACTIVE EMERGENCIES</div>
                    <div className="text-[11px] text-[#A8B6BC] mt-1">The network is currently stable.</div>
                  </div>
                ) : (
                  <div className="divide-y divide-[#DCE7EC] max-h-[380px] overflow-auto">
                    {queueSorted.map(req => {
                      const isSel = selectedReq?.id === req.id
                      const wait = Math.floor((Date.now() - req.createdAt) / 60000)
                      const isCrit = req.urgency === 'Critical'
                      return (
                        <button key={req.id} onClick={() => setSelectedId(req.id)} className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#F8FBFC] transition-colors ${isSel ? 'bg-[#EAF7FC]' : 'bg-white'} ${isCrit ? 'border-l-[3px] border-l-[#D92D3A]' : 'border-l-[3px] border-l-transparent'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${isCrit ? 'bg-[#FDECEE] text-[#D92D3A] border-[#FDECEE]' : req.urgency === 'High' ? 'bg-[#FFF5E5] text-[#D88A16] border-[#FFF5E5]' : 'bg-[#F4F8FA] text-[#58707B] border-[#DCE7EC]'}`}>
                                {isCrit && <span className="w-1.5 h-1.5 rounded-full bg-[#D92D3A] pulse-dot inline-block" />}
                                {req.urgency.toUpperCase()}
                              </span>
                              <span className="font-mono text-[12px] font-bold text-[#123B5D]">{req.id}</span>
                              <span className="text-[12px] font-medium text-[#16313F] truncate">{graph.getNode(req.originNode)?.name}</span>
                              <span className="ml-auto text-[11px] font-semibold tabular-nums text-[#123B5D]">WAIT {String(wait).padStart(2, '0')}:{(String(Math.floor((Date.now() - req.createdAt) / 1000) % 60).padStart(2, '0'))}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[#58707B]">
                              <span>{req.requiredSpecialties.join(', ') || 'general'} {req.requiresICU ? '· ICU' : ''}</span>
                              <span className="text-[#DCE7EC]">·</span>
                              <span>{req.requiredMedicines.join(', ')}</span>
                              {isSel && selection?.selected && <><span className="text-[#DCE7EC]">·</span><span className="text-[#1677A8] font-medium">{selection.selected.name} · ETA {selection.bestDetail?.travelTime?.toFixed(1)}m</span></>}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Facilities table clinical */}
              <div className="panel mt-4 overflow-hidden">
                <div className="h-10 px-4 flex items-center justify-between border-b border-[#DCE7EC] bg-white">
                  <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">FACILITIES & RESOURCES</h3>
                  <span className="text-[11px] text-[#81949D]">Tap to mutate state — observe rejection</span>
                </div>
                <div className="overflow-auto max-h-[520px]">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-[#F8FBFC] border-b border-[#DCE7EC] text-[11px] tracking-wide text-[#58707B]">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Hospital</th>
                        <th className="text-left px-3 py-2 font-semibold">Beds / ICU</th>
                        <th className="text-left px-3 py-2 font-semibold">Queue</th>
                        <th className="text-left px-3 py-2 font-semibold">Stock</th>
                        <th className="text-left px-3 py-2 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE7EC]">
                      {hospitals.map(h => {
                        const isSel = selection?.selected?.id === h.id
                        return (
                          <tr key={h.id} className={isSel ? 'bg-[#EAF7FC]' : 'bg-white hover:bg-[#F8FBFC]'}>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-[#123B5D] flex items-center gap-1.5">{h.name} {isSel && <span className="px-1.5 py-0.5 bg-[#238B68] text-white rounded-full text-[10px] font-bold">SELECTED</span>}</div>
                              <div className="text-[11px] text-[#81949D]">{h.id} · {h.nodeId} · <span className={h.operatingStatus === 'OPEN' ? 'text-[#238B68]' : 'text-[#D92D3A]'}>● {h.operatingStatus}</span></div>
                              <div className="flex flex-wrap gap-1 mt-1">{h.specialties.slice(0, 3).map(s => <span key={s} className="px-1.5 py-0.5 bg-[#F4F8FA] border border-[#DCE7EC] rounded text-[10px] text-[#58707B]">{s}</span>)}</div>
                            </td>
                            <td className="px-3 py-2 tabular-nums">
                              <div className="text-[#16313F]">{h.bedsAvailable}/{h.bedsTotal} beds</div>
                              <div className="text-[#58707B] text-[11px]">{h.icuAvailable}/{h.icuTotal} ICU</div>
                              <div className="mt-1 h-1 bg-[#F4F8FA] border border-[#DCE7EC] rounded-full overflow-hidden w-[90px]"><div className="h-full bg-[#1677A8]" style={{ width: `${(h.bedsAvailable / h.bedsTotal) * 100}%` }} /></div>
                            </td>
                            <td className="px-3 py-2 tabular-nums text-[#16313F]">{h.queueLength} <span className="text-[#81949D] text-[11px]">· {h.queueLength * 4}m wait</span></td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(h.medicineStock).slice(0, 3).map(([k, v]) => {
                                  const th = h.medicineThresholds[k]
                                  const tone = v <= th.critical ? 'bg-[#FDECEE] text-[#D92D3A] border-[#FDECEE]' : v <= th.minimum ? 'bg-[#FFF5E5] text-[#D88A16] border-[#FFF5E5]' : 'bg-[#F4F8FA] text-[#58707B] border-[#DCE7EC]'
                                  return <span key={k} className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${tone}`}>{k}:{v}</span>
                                })}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => handleToggleHospital(h.id, { operatingStatus: h.operatingStatus === 'OPEN' ? 'CLOSED' : 'OPEN' })} className="px-2 py-1 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px] font-medium text-[#285466] hover:bg-[#F8FBFC]">{h.operatingStatus === 'OPEN' ? 'Close' : 'Open'}</button>
                                <button onClick={() => handleToggleHospital(h.id, { bedsAvailable: Math.max(0, h.bedsAvailable - 5) })} className="px-2 py-1 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px]">-5 beds</button>
                                <button onClick={() => handleToggleHospital(h.id, { icuAvailable: 0 })} className="px-2 py-1 bg-[#FDECEE] border border-[#FDECEE] rounded-[5px] text-[11px] font-medium text-[#D92D3A]">Fill ICU</button>
                                <button onClick={() => handleToggleHospital(h.id, { medicineStock: { ...h.medicineStock, epinephrine: 0 } })} className="px-2 py-1 bg-[#FFF5E5] border border-[#FFF5E5] rounded-[5px] text-[11px]">Stockout</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-span-12 xl:col-span-5 space-y-4">
              {/* Event stream — chronological operational log spec */}
              <div className="panel overflow-hidden">
                <div className="h-10 px-4 flex items-center justify-between border-b border-[#DCE7EC] bg-white">
                  <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">EVENT STREAM</h3>
                  <span className="text-[11px] text-[#81949D]">{logs.length} events</span>
                </div>
                {logs.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[#A8B6BC]">No events — create an emergency to see A* · dispatch · hospital selection</div>
                ) : (
                  <div className="max-h-[380px] overflow-auto divide-y divide-[#DCE7EC] font-mono text-[11px]">
                    {logs.map((l, i) => (
                      <div key={i} className={`px-3 py-2 flex gap-3 ${l.tone === 'critical' ? 'bg-[#FDECEE]/60' : l.tone === 'success' ? 'bg-[#EAF7F2]/50' : l.tone === 'warning' ? 'bg-[#FFF5E5]/60' : 'bg-white'}`}>
                        <span className="text-[#81949D] shrink-0">{l.ts}</span>
                        <span className={`font-bold shrink-0 ${l.tone === 'critical' ? 'text-[#D92D3A]' : l.tone === 'success' ? 'text-[#238B68]' : l.tone === 'warning' ? 'text-[#D88A16]' : 'text-[#1677A8]'}`}>{l.type}</span>
                        <span className="text-[#16313F]">{l.msg}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hospital selection candidates */}
              <div className="panel p-4">
                <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">CANDIDATES <span className="font-normal text-[#81949D]">sorted by total cost</span></h3>
                {!selectedReq ? <p className="text-[11px] text-[#81949D] mt-2">Select a request</p> : (
                  <div className="mt-3 space-y-2 max-h-[340px] overflow-auto pr-1">
                    {selection?.candidates.slice(0, 12).map(c => (
                      <div key={c.hospital.id} className={`px-3 py-2 rounded-[6px] border flex justify-between gap-2 ${c.feasible ? 'bg-white border-[#DCE7EC]' : 'bg-[#FDECEE] border-[#FDECEE]'}`}>
                        <div>
                          <div className="text-[12px] font-semibold text-[#123B5D]">{c.hospital.name} <span className="font-normal text-[#81949D]">· {c.hospital.id}</span></div>
                          <div className={`text-[11px] ${c.feasible ? 'text-[#58707B]' : 'text-[#D92D3A]'}`}>{c.reason}</div>
                        </div>
                        {c.feasible ? <span className="shrink-0 px-2 py-0.5 bg-[#EAF7FC] border border-[#A7DCF0] text-[#1677A8] rounded-full text-[11px] font-bold tabular-nums">{c.totalCost.toFixed(1)}</span> : <span className="shrink-0 px-2 py-0.5 bg-white border border-[#DCE7EC] text-[#D92D3A] rounded-full text-[11px] font-bold">REJECT</span>}
                      </div>
                    ))}
                  </div>
                )}
                {selection?.candidates?.length > 0 && <p className="text-[11px] text-[#81949D] mt-2">Feasibility before optimization — nearest infeasible is rejected.</p>}
              </div>

              {/* Decision log */}
              <div className="panel p-4">
                <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D] flex items-center justify-between">DECISION LOG <span className="text-[11px] font-normal text-[#81949D]">{decisions.length}</span></h3>
                {decisions.length === 0 ? <p className="text-[11px] text-[#81949D] mt-2">No decisions yet</p> : (
                  <div className="mt-2 space-y-2 max-h-[260px] overflow-auto pr-1">
                    {decisions.slice(0, 10).map(d => (
                      <div key={d.id} className="px-3 py-2 bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] text-[11px]">
                        <div className="flex justify-between"><span className="font-mono font-bold text-[#123B5D]">{d.id}</span><span className="text-[#81949D]">{new Date(d.timestamp).toLocaleTimeString()}</span></div>
                        <div className="font-semibold text-[#16313F] mt-0.5">{d.decisionType} · {d.requestId} · <span className="text-[#1677A8]">{d.algorithm}</span></div>
                        <div className="text-[#58707B]">{d.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Analytics preview — thin charts placeholder per spec */}
              <div className="panel p-4">
                <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">ANALYTICS — SMART vs BASELINE</h3>
                <p className="text-[11px] text-[#81949D] mt-1">All numbers are simulated benchmark results.</p>
                <div className="mt-3 overflow-hidden border border-[#DCE7EC] rounded-[6px]">
                  <div className="grid grid-cols-3 bg-[#F8FBFC] text-[11px] font-semibold tracking-wide text-[#58707B] px-3 py-2 border-b border-[#DCE7EC]">
                    <span></span><span className="text-right">BASELINE</span><span className="text-right text-[#1677A8]">SMART</span>
                  </div>
                  {[
                    ['Response Time', '28m', '22m ↓ 21%'],
                    ['Waiting Time', '34m', '11m ↓ 68%'],
                    ['Failed Assignments', '18%', '4% ↓ 78%'],
                  ].map(([k, b, s]) => (
                    <div key={k} className="grid grid-cols-3 px-3 py-2 text-[12px] border-b last:border-0 border-[#DCE7EC] bg-white">
                      <span className="text-[#16313F] font-medium">{k}</span>
                      <span className="text-right tabular-nums text-[#58707B]">{b}</span>
                      <span className="text-right tabular-nums font-bold text-[#238B68]">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Simulation drawer */}
          {simOpen && (
            <div className="mx-4 mb-6 panel p-4 border-[#C7D7DE]">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-bold tracking-[0.06em] text-[#123B5D]">SIMULATION CONTROLS</h3>
                <button onClick={() => setSimOpen(false)} className="text-[11px] font-semibold text-[#58707B] hover:text-[#123B5D] border border-[#DCE7EC] px-2 py-1 rounded-[5px] bg-white">Close</button>
              </div>
              <p className="text-[11px] text-[#81949D] mt-1">Controls are compact and visually secondary during normal operation.</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-3">
                  <div className="micro text-[#123B5D]">Network Events</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button onClick={() => { setRoadStatus(s => ({ ...s, status: 'CLOSED' })); }} className="px-2.5 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px] font-medium">Close Road</button>
                    <button onClick={() => { setRoadStatus(s => ({ ...s, status: 'SLOW' })); }} className="px-2.5 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px] font-medium">Slow Road</button>
                    <button onClick={() => setHospitals(hs => hs.map((h, i) => i === 0 ? { ...h, operatingStatus: 'CLOSED' } : h))} className="px-2.5 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px] font-medium">Fill Hospital</button>
                    <button onClick={() => setHospitals(hs => hs.map((h, i) => i === 0 ? { ...h, icuAvailable: 0 } : h))} className="px-2.5 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px] font-medium">Remove Specialist</button>
                  </div>
                </div>
                <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-3">
                  <div className="micro text-[#123B5D]">Resource Events</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button onClick={() => setHospitals(hs => hs.map((h, i) => i === 0 ? { ...h, medicineStock: { ...h.medicineStock, insulin: 0 } } : h))} className="px-2.5 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px] font-medium">Create Stockout</button>
                    <button onClick={() => setCrossRegion(v => !v)} className="px-2.5 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px] font-medium">{crossRegion ? 'Disable' : 'Enable'} Cross-region</button>
                    <button onClick={handleDemoScenario} className="px-2.5 py-1.5 bg-[#1677A8] text-white rounded-[5px] text-[11px] font-semibold">Critical Emergency</button>
                  </div>
                </div>
                <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-3">
                  <div className="micro text-[#123B5D]">Scenarios</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button onClick={handleDemoScenario} className="px-2.5 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px] font-medium">Road Closure</button>
                    <button onClick={handleDemoScenario} className="px-2.5 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-[11px] font-medium">Fleet Shortage</button>
                    <button onClick={handleReset} className="px-2.5 py-1.5 bg-white border border-[#D92D3A] text-[#D92D3A] rounded-[5px] text-[11px] font-semibold">Restore Network</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <footer className="mx-4 pb-6 text-center text-[11px] text-[#81949D] border-t border-[#DCE7EC] pt-3">
            Healthcare Network · deterministic routing · explainable decisions · measured timings from <span className="font-mono">performance.now()</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
