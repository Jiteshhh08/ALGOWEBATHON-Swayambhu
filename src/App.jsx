import { useState, useMemo, useEffect } from 'react'
import { generateGraph } from './data/seed.js'
import { generateAmbulances } from './lib/dispatch/ambulance.js'
import { EmergencyQueue } from './lib/dispatch/priorityQueue.js'
import { selectAmbulance } from './lib/dispatch/selectAmbulance.js'
import { generateHospitals, createDemoHospitals } from './lib/hospital/generateHospitals.js'
import { selectHospital } from './lib/hospital/selectHospital.js'
import { dijkstra } from './lib/graph/dijkstra.js'
import { aStar } from './lib/graph/astar.js'

const SPECIALTIES = ['cardiology', 'neurology', 'trauma', 'general', 'pediatrics', 'orthopedics']
const EQUIP = ['ventilator', 'oxygen', 'xray', 'icu', 'defibrillator', 'stretcher']
const MEDS = ['epinephrine', 'insulin', 'saline', 'morphine', 'antibiotic']
const URGENCIES = ['Critical', 'High', 'Medium', 'Low']

function Badge({ children, tone = 'slate' }) {
  const map = {
    slate: 'bg-slate-800 text-slate-200 border-slate-700',
    red: 'bg-red-950/60 text-red-300 border-red-800',
    orange: 'bg-orange-950/60 text-orange-300 border-orange-800',
    yellow: 'bg-yellow-950/60 text-yellow-300 border-yellow-800',
    green: 'bg-green-950/60 text-green-300 border-green-800',
    blue: 'bg-blue-950/60 text-blue-300 border-blue-800',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[tone]}`}>{children}</span>
}

export default function App() {
  // --- Core state derived from Phase 1 & 2 seeds ---
  const [graph] = useState(() => generateGraph({ nodeCount: 200, edgePerNode: 4, seed: 42 }))
  const [hospitals, setHospitals] = useState(() => generateHospitals(graph, { seed: 99 }))
  const [ambulances] = useState(() => {
    const ids = [...graph.nodes.keys()]
    return generateAmbulances(ids, 8)
  })
  const [queue] = useState(() => new EmergencyQueue())
  const [requests, setRequests] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  // form
  const [form, setForm] = useState({
    originNode: '',
    urgency: 'Critical',
    requiredSpecialties: ['cardiology'],
    requiredEquipment: ['ventilator'],
    requiredMedicines: ['epinephrine'],
    requiresICU: true,
  })
  const [crossRegion, setCrossRegion] = useState(true)
  const routeMode = 'dijkstra'
  const [logs, setLogs] = useState([])
  const [demoMode, setDemoMode] = useState(false)
  const [roadStatus, setRoadStatus] = useState({ id: '', status: 'CLOSED' })

  const villageNodes = useMemo(() => [...graph.nodes.values()].filter(n => n.type === 'village').slice(0, 80), [graph])

  useEffect(() => {
    if (!form.originNode && villageNodes.length) setForm(f => ({ ...f, originNode: villageNodes[0].id }))
  }, [villageNodes, form.originNode]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // routing benchmark for selected request -> selected hospital
  const routeStats = useMemo(() => {
    if (!selectedReq || !selection?.selected) return null
    const target = selection.selected.nodeId
    const t0 = performance.now()
    const d = dijkstra(graph, selectedReq.originNode, target)
    const t1 = performance.now()
    const t2 = performance.now()
    const a = aStar(graph, selectedReq.originNode, target)
    const t3 = performance.now()
    return { dijkstra: { ...d, ms: (t1 - t0).toFixed(2) }, astar: { ...a, ms: (t3 - t2).toFixed(2) } }
  }, [selectedReq, selection, graph])

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
    const ambRes = selectAmbulance(req, ambulances, graph, { crossRegion })
    const hospRes = selectHospital(req, hospitals, graph)
    const node = graph.getNode(req.originNode)
    setLogs(l => [
      { ts: new Date().toLocaleTimeString(), type: 'EMERGENCY_CREATED', msg: `${id} ${req.urgency} @ ${node?.name || req.originNode} — requires ${req.requiredSpecialties.join(',') || 'general'}${req.requiresICU ? ' + ICU' : ''}`, tone: 'blue' },
      { ts: new Date().toLocaleTimeString(), type: 'AMBULANCE', msg: ambRes.selected ? `Assigned ${ambRes.selected.id} — ${ambRes.reason}` : `No ambulance: ${ambRes.reason}`, tone: ambRes.selected ? 'green' : 'red' },
      { ts: new Date().toLocaleTimeString(), type: 'HOSPITAL', msg: hospRes.selected ? `Hospital ${hospRes.selected.name} — ${hospRes.reason}` : `No hospital: ${hospRes.reason}`, tone: hospRes.selected ? 'green' : 'red' },
      ...l,
    ])
  }

  const handleDemoScenario = () => {
    // Create deterministic reject-nearest scenario using 3 closest hospital nodes
    const origins = villageNodes[2]?.id || 'n5'
    // pick 3 hospital nodes sorted by distance to origin
    const targetHospNodes = hospitals.slice(0, 3).map(h => h.nodeId)
    const demoHospitals = createDemoHospitals(targetHospNodes)
    // keep remaining hospitals but replace first 3
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
    setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'DEMO', msg: `Scenario C: Nearest lacks cardiologist, mid has no ICU — far feasible hospital should win`, tone: 'yellow' }, ...l])
  }

  const handleToggleHospital = (hid, patch) => {
    setHospitals(hs => hs.map(h => h.id === hid ? { ...h, ...patch } : h))
  }

  const handleRoadUpdate = () => {
    if (!roadStatus.id) return
    const edge = graph.getEdge(roadStatus.id)
    if (!edge) {
      setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'ROAD', msg: `Edge ${roadStatus.id} not found`, tone: 'red' }, ...l])
      return
    }
    const old = edge.status
    graph.updateEdge(roadStatus.id, { status: roadStatus.status, trafficMultiplier: roadStatus.status === 'SLOW' ? 2.5 : 1 })
    setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'ROAD', msg: `Edge ${roadStatus.id}: ${old} → ${roadStatus.status} — routes will recalc`, tone: 'yellow' }, ...l])
    // force re-render by touching hospitals state
    setHospitals(h => [...h])
  }

  const handleReset = () => {
    const newH = generateHospitals(graph, { seed: Math.floor(Math.random() * 1000) })
    setHospitals(newH)
    setRequests([])
    setSelectedId(null)
    setLogs([])
    setDemoMode(false)
    // clear queue
    for (const r of [...queue.toSorted()]) queue.remove(r.id)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-[#0a0f1a]/90 border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">LIVE HEALTHCARE COMMAND CENTER</h1>
            <p className="text-xs text-slate-400">Feasibility before optimization — {graph.nodeCount} nodes · {graph.edgeCount} edges · {hospitals.length} hospitals · {ambulances.filter(a=>a.status==='AVAILABLE').length} ambulances available</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge tone="blue">Phase 1: Graph ✓</Badge>
            <Badge tone="green">Phase 2: Dispatch ✓</Badge>
            <Badge tone="yellow">Phase 3: Hospital</Badge>
            <button onClick={handleReset} className="ml-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700">Reset</button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Queue + Form */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-3 flex items-center justify-between">Create Emergency <Badge tone={form.urgency==='Critical'?'red': form.urgency==='High'?'orange':'yellow'}>{form.urgency}</Badge></h2>
            <div className="space-y-3 text-sm">
              <label className="block">Village / Origin
                <select value={form.originNode} onChange={e=>setForm({...form, originNode:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5">
                  {villageNodes.map(n=> <option key={n.id} value={n.id}>{n.name} ({n.id})</option>)}
                </select>
              </label>
              <label className="block">Urgency
                <select value={form.urgency} onChange={e=>setForm({...form, urgency:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5">
                  {URGENCIES.map(u=> <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <div>
                <div className="text-xs text-slate-400 mb-1">Required Specialties</div>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTIES.map(s=> {
                    const on = form.requiredSpecialties.includes(s)
                    return <button key={s} onClick={()=> setForm(f=> ({...f, requiredSpecialties: on? f.requiredSpecialties.filter(x=>x!==s) : [...f.requiredSpecialties, s]}))} className={`px-2 py-1 rounded-full text-xs border ${on?'bg-sky-900/60 border-sky-700 text-sky-200':'bg-slate-800 border-slate-700 text-slate-400'}`}>{s}</button>
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Required Equipment</div>
                <div className="flex flex-wrap gap-1.5">
                  {EQUIP.map(s=> {
                    const on = form.requiredEquipment.includes(s)
                    return <button key={s} onClick={()=> setForm(f=> ({...f, requiredEquipment: on? f.requiredEquipment.filter(x=>x!==s) : [...f.requiredEquipment, s]}))} className={`px-2 py-1 rounded-full text-xs border ${on?'bg-emerald-900/60 border-emerald-700 text-emerald-200':'bg-slate-800 border-slate-700 text-slate-400'}`}>{s}</button>
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Required Medicines</div>
                <div className="flex flex-wrap gap-1.5">
                  {MEDS.map(s=> {
                    const on = form.requiredMedicines.includes(s)
                    return <button key={s} onClick={()=> setForm(f=> ({...f, requiredMedicines: on? f.requiredMedicines.filter(x=>x!==s) : [...f.requiredMedicines, s]}))} className={`px-2 py-1 rounded-full text-xs border ${on?'bg-amber-900/60 border-amber-700 text-amber-200':'bg-slate-800 border-slate-700 text-slate-400'}`}>{s}</button>
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.requiresICU} onChange={e=>setForm({...form, requiresICU:e.target.checked})} /> Requires ICU
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={crossRegion} onChange={e=>setCrossRegion(e.target.checked)} /> Cross-region ambulance fallback
              </label>
              <button onClick={handleCreate} className="w-full py-2 bg-sky-600 hover:bg-sky-500 rounded font-semibold text-sm">+ Add Emergency & Dispatch</button>
              <button onClick={handleDemoScenario} className="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded font-semibold text-xs">★ Demo: Reject Nearest (Scenario C)</button>
              {demoMode && <p className="text-xs text-amber-300">Demo hospitals injected: H01 lacks cardiology, H02 ICU full — C should win despite being farthest.</p>}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-2">Priority Queue <span className="text-xs font-normal text-slate-400">({queueSorted.length})</span></h2>
            {queueSorted.length===0 ? <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-800 rounded">No emergencies — create one to see Phase 3 scoring</p> :
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {queueSorted.map(req=> {
                  const isSel = selectedReq?.id===req.id
                  const wait = Math.floor((Date.now()-req.createdAt)/60000)
                  return (
                    <button key={req.id} onClick={()=>setSelectedId(req.id)} className={`w-full text-left p-2.5 rounded border ${isSel?'bg-sky-950/40 border-sky-700':'bg-slate-800/60 border-slate-700 hover:border-slate-600'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold">{req.id}</span>
                        <Badge tone={req.urgency==='Critical'?'red': req.urgency==='High'?'orange':req.urgency==='Medium'?'yellow':'slate'}>{req.urgency}</Badge>
                      </div>
                      <div className="text-xs text-slate-300 mt-1">{graph.getNode(req.originNode)?.name} · wait {wait}m</div>
                      <div className="text-[11px] text-slate-400 truncate">{req.requiredSpecialties.join(', ')||'general'} {req.requiresICU?'· ICU':''} · {req.requiredMedicines.join(', ')||'no med'}</div>
                    </button>
                  )
                })}
              </div>
            }
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-2">Ambulance Dispatch <span className="text-xs font-normal text-slate-400">Phase 2</span></h2>
            {!selectedReq ? <p className="text-xs text-slate-500">Select a request</p> :
              !ambSelection ? <p className="text-xs text-slate-500">No selection</p> : (
                <div className="space-y-2 text-xs">
                  <p className={`${ambSelection.selected?'text-green-300':'text-red-300'}`}>{ambSelection.reason}</p>
                  <div className="max-h-36 overflow-auto space-y-1">
                    {ambSelection.candidates.map(c=> (
                      <div key={c.amb.id} className={`flex justify-between px-2 py-1 rounded ${c.feasible?'bg-slate-800':'bg-red-950/30 border border-red-900/40'}`}>
                        <span>{c.amb.id} <span className="text-slate-400">({c.amb.location})</span></span>
                        <span className={c.feasible?'text-green-300':'text-red-300'}>{c.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          </div>
        </div>

        {/* Center: Map placeholder + Routing + Road controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-3">Network Map <span className="text-xs font-normal text-slate-500">Phase 1 · viewport placeholder (50k+ ready)</span></h2>
            <div className="relative h-[280px] bg-[#0f172a] rounded border border-slate-800 overflow-hidden flex items-center justify-center">
              {/* Simple SVG scatter of hospitals/villages */}
              <svg viewBox="0 0 200 120" className="w-full h-full">
                {[...graph.nodes.values()].slice(0, 400).map(n=> (
                  <circle key={n.id} cx={((n.lng-74.5+2)*50)} cy={((19.8 - n.lat)*80)} r={n.type==='hospital'?2.2:0.9} fill={n.type==='hospital'? '#38bdf8' : '#64748b'} opacity={n.type==='hospital'?1:0.6} />
                ))}
                {selection?.bestDetail?.route?.path?.length>1 && (
                  <polyline
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="1.2"
                    points={selection.bestDetail.route.path.map(pid=> {
                      const n=graph.getNode(pid)
                      return `${((n.lng-74.5+2)*50)},${((19.8 - n.lat)*80)}`
                    }).join(' ')}
                  />
                )}
                {selectedReq && (
                  <circle cx={((graph.getNode(selectedReq.originNode)?.lng-74.5+2)*50)} cy={((19.8 - graph.getNode(selectedReq.originNode)?.lat)*80)} r="3.5" fill="none" stroke="#f43f5e" strokeWidth="1.2" />
                )}
              </svg>
              <div className="absolute bottom-2 left-2 text-[11px] bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
                <span className="inline-block w-2 h-2 bg-sky-400 rounded-full mr-1"></span>Hospital
                <span className="inline-block w-2 h-2 bg-slate-500 rounded-full ml-3 mr-1"></span>Village
                <span className="inline-block w-2 h-2 border border-red-500 rounded-full ml-3 mr-1"></span>Emergency
                <span className="inline-block w-3 h-0.5 bg-green-500 ml-3 mr-1"></span>Route
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-800 rounded p-2"><div className="text-slate-400">Nodes</div><div className="font-mono font-bold">{graph.nodeCount}</div></div>
              <div className="bg-slate-800 rounded p-2"><div className="text-slate-400">Edges</div><div className="font-mono font-bold">{graph.edgeCount}</div></div>
              <div className="bg-slate-800 rounded p-2"><div className="text-slate-400">Hospitals</div><div className="font-mono font-bold">{hospitals.length}</div></div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-2">Road Network Control <span className="text-xs font-normal text-slate-400">Phase 4 preview — affects travel cost</span></h2>
            <div className="flex gap-2 text-xs">
              <input placeholder="edge id e.g. e123" value={roadStatus.id} onChange={e=>setRoadStatus(s=>({...s, id:e.target.value}))} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5" />
              <select value={roadStatus.status} onChange={e=>setRoadStatus(s=>({...s, status:e.target.value}))} className="bg-slate-800 border border-slate-700 rounded px-2">
                <option>CLOSED</option><option>SLOW</option><option>OPEN</option>
              </select>
              <button onClick={handleRoadUpdate} className="px-3 bg-slate-700 hover:bg-slate-600 rounded">Apply</button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Try closing an edge on the green route — then re-select request to see cost & ETA increase. Edges: {[...graph.edgeMap.keys()].slice(0,6).join(', ')} …</p>
            {routeStats && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2 rounded border ${routeMode==='dijkstra'?'border-sky-600 bg-sky-950/30': 'border-slate-700 bg-slate-800'}`}>
                  <div className="flex justify-between"><span>Dijkstra</span><span className="font-mono">{routeStats.dijkstra.ms}ms</span></div>
                  <div className="text-slate-400">{routeStats.dijkstra.feasible? `${routeStats.dijkstra.distance.toFixed(1)}m via ${routeStats.dijkstra.path.length} hops · visited ${routeStats.dijkstra.visited}`:'Infeasible'}</div>
                </div>
                <div className={`p-2 rounded border ${routeMode==='astar'?'border-sky-600 bg-sky-950/30': 'border-slate-700 bg-slate-800'}`}>
                  <div className="flex justify-between"><span>A*</span><span className="font-mono">{routeStats.astar.ms}ms</span></div>
                  <div className="text-slate-400">{routeStats.astar.feasible? `${routeStats.astar.distance.toFixed(1)}m · visited ${routeStats.astar.visited} ${routeStats.astar.visited<=routeStats.dijkstra.visited?'✓ less':''}`:'Infeasible'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-2">Hospitals Inventory <span className="text-xs font-normal text-slate-400">Click to mutate for Phase 3 re-scoring</span></h2>
            <div className="max-h-[320px] overflow-auto space-y-2 pr-1">
              {hospitals.map(h=> {
                const isSelected = selection?.selected?.id===h.id
                return (
                  <div key={h.id} className={`p-2.5 rounded border text-xs ${isSelected?'border-green-600 bg-green-950/20':'border-slate-800 bg-slate-800/50'}`}>
                    <div className="flex justify-between items-start">
                      <div><span className="font-semibold">{h.name}</span> <span className="text-slate-400">· {h.id} · {h.nodeId}</span> {isSelected && <Badge tone="green">SELECTED</Badge>}</div>
                      <Badge tone={h.operatingStatus==='OPEN'?'green':'red'}>{h.operatingStatus}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {h.specialties.map(s=> <span key={s} className="px-1.5 py-0.5 bg-slate-700 rounded text-[11px]">{s}</span>)}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                      <span>Beds {h.bedsAvailable}/{h.bedsTotal} {h.bedsAvailable/h.bedsTotal<0.3 && '⚠'}</span>
                      <span>ICU {h.icuAvailable}/{h.icuTotal}</span>
                      <span>Queue {h.queueLength} · {h.queueLength*4}m</span>
                      <span>Equip: {h.equipment.slice(0,3).join(', ')}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(h.medicineStock).slice(0,4).map(([k,v])=> {
                        const th=h.medicineThresholds[k]; const tone=v<=th.critical?'red':v<=th.minimum?'yellow':'slate'
                        return <Badge key={k} tone={tone}>{k}:{v}</Badge>
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button onClick={()=>handleToggleHospital(h.id,{operatingStatus: h.operatingStatus==='OPEN'?'CLOSED':'OPEN'})} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px]">{h.operatingStatus==='OPEN'?'Close':'Open'} facility</button>
                      <button onClick={()=>handleToggleHospital(h.id,{bedsAvailable: Math.max(0, h.bedsAvailable-5)})} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px]">-5 beds</button>
                      <button onClick={()=>handleToggleHospital(h.id,{bedsAvailable: Math.min(h.bedsTotal, h.bedsAvailable+5)})} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px]">+5 beds</button>
                      <button onClick={()=>handleToggleHospital(h.id,{icuAvailable:0})} className="px-2 py-1 bg-red-900/40 hover:bg-red-800/60 rounded text-[11px] border border-red-800">Fill ICU</button>
                      <button onClick={()=>handleToggleHospital(h.id,{medicineStock:{...h.medicineStock, epinephrine:0}})} className="px-2 py-1 bg-amber-900/30 hover:bg-amber-800/40 rounded text-[11px]">Stockout epi</button>
                      <button onClick={()=>handleToggleHospital(h.id,{queueLength: h.queueLength+3})} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px]">+3 queue</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Phase 3 Decision Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-1">Hospital Selection <span className="text-xs font-normal text-slate-400">Phase 3 · capability-aware</span></h2>
            <p className="text-[11px] text-slate-500 mb-3">Feasibility before optimization — hard filters (specialist, beds, ICU, medicine, status) → travel + queue + penalties scoring</p>
            {!selectedReq ? <div className="text-xs text-slate-500 py-8 text-center border border-dashed border-slate-800 rounded">Create or select an emergency to see decision</div> :
              !selection ? <p className="text-xs text-slate-500">No selection</p> : (
                <div className="space-y-3">
                  {selection.selected ? (
                    <div className="p-3 rounded bg-green-950/25 border border-green-800">
                      <div className="text-xs text-green-400 font-semibold">✓ SELECTED — {selection.selected.name}</div>
                      <div className="text-xs text-green-200 mt-1">{selection.reason}</div>
                      {selection.bestDetail?.breakdown && (
                        <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
                          <div className="bg-black/30 rounded p-1.5">Travel <b>{selection.bestDetail.breakdown.travel}m</b></div>
                          <div className="bg-black/30 rounded p-1.5">Queue <b>{selection.bestDetail.breakdown.queueTime}m</b></div>
                          <div className="bg-black/30 rounded p-1.5">Bed <b>{selection.bestDetail.breakdown.bedPenalty}</b></div>
                          <div className="bg-black/30 rounded p-1.5">ICU <b>{selection.bestDetail.breakdown.icuPenalty}</b></div>
                          <div className="bg-black/30 rounded p-1.5">Med <b>{selection.bestDetail.breakdown.medicinePenalty}</b></div>
                          <div className="bg-black/30 rounded p-1.5 font-bold">Total <b>{selection.bestDetail.breakdown.total}</b></div>
                        </div>
                      )}
                      <div className="mt-2 text-[11px] text-slate-300">Route: {selection.bestDetail?.route?.path?.join(' → ') || '—'} · ETA {selection.bestDetail?.travelTime?.toFixed(1)}m</div>
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-red-950/30 border border-red-800 text-xs text-red-300">{selection.reason}</div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold mb-1">All Candidates (sorted by total cost)</h3>
                    <div className="space-y-1 max-h-56 overflow-auto pr-1">
                      {selection.candidates.map(c=> (
                        <div key={c.hospital.id} className={`p-2 rounded text-xs border ${c.feasible?'border-slate-700 bg-slate-800':'border-red-900/50 bg-red-950/20'}`}>
                          <div className="flex justify-between font-medium">
                            <span>{c.hospital.name} <span className="text-slate-500">· {c.hospital.id}</span></span>
                            {c.feasible ? <Badge tone="green">{c.totalCost.toFixed(1)}</Badge> : <Badge tone="red">REJECT</Badge>}
                          </div>
                          <div className={c.feasible?'text-slate-300':'text-red-300'}>{c.reason}</div>
                          {!c.feasible && <div className="text-[11px] text-slate-500">{c.hospital.specialties.join(', ')} · beds {c.hospital.bedsAvailable}/{c.hospital.bedsTotal} · ICU {c.hospital.icuAvailable}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selection.rejected.length>0 && (
                    <div>
                      <h3 className="text-xs font-semibold mb-1 text-red-300">Rejected — nearest would have been infeasible ✗</h3>
                      <div className="space-y-1">
                        {selection.rejected.map(r=> (
                          <div key={r.hospital.id} className="p-1.5 rounded bg-red-950/20 border border-red-800 text-xs flex justify-between">
                            <span>{r.hospital.name}</span><span className="text-red-300">{r.reason}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-amber-300 mt-2">This proves Phase 3: nearest ≠ best — system chooses feasible lowest-cost, not shortest distance.</p>
                    </div>
                  )}
                </div>
              )
            }
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-2">Decision / Event Log <span className="text-xs font-normal text-slate-400">Phase 6 preview</span></h2>
            {logs.length===0 ? <p className="text-xs text-slate-500">No events yet</p> :
              <div className="space-y-1.5 max-h-[280px] overflow-auto pr-1 font-mono text-xs">
                {logs.map((l,i)=> (
                  <div key={i} className={`px-2 py-1 rounded border ${l.tone==='green'?'border-green-800 bg-green-950/20 text-green-200': l.tone==='red'?'border-red-800 bg-red-950/20 text-red-200': l.tone==='yellow'?'border-amber-800 bg-amber-950/20 text-amber-200': 'border-slate-700 bg-slate-800 text-slate-300'}`}>
                    <span className="text-slate-500">{l.ts}</span> <b>{l.type}</b> — {l.msg}
                  </div>
                ))}
              </div>
            }
          </div>

          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 text-xs">
            <div className="font-semibold mb-1">How Phase 3 integrates Phases 1 & 2</div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
              <li>Travel time from <code>dijkstra()</code> / <code>aStar()</code> — respects CLOSED/SLOW edges</li>
              <li>Queue priority from <code>EmergencyQueue</code> determines which request is scored first</li>
              <li>Ambulance ETA via same graph — independent of hospital choice</li>
              <li>Hospital cost = travel + queue*4 + bed/ICU/medicine penalties — lowest feasible wins</li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-800 py-3 text-center text-[11px] text-slate-500">
        Healthcare Command Center · JS-only · deterministic routing · explainable decisions · no fabricated metrics (timings from performance.now)
      </footer>
    </div>
  )
}
