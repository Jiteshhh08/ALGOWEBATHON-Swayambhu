import { useState, useMemo, useEffect } from 'react'
import { generateGraph } from './data/seed.js'
import { generateAmbulances } from './lib/dispatch/ambulance.js'
import { EmergencyQueue } from './lib/dispatch/priorityQueue.js'
import { selectAmbulance } from './lib/dispatch/selectAmbulance.js'
import { generateHospitals, createDemoHospitals } from './lib/hospital/generateHospitals.js'
import { selectHospital } from './lib/hospital/selectHospital.js'
import { decideAmbulance, decideHospital, decideRoute } from './lib/decision/decisionEngine.js'
import { createEventLog } from './lib/decision/eventLog.js'
import { generateDoctorsForHospital } from './lib/resources/doctors.js'
import { compareTransferVsDelivery } from './lib/resources/transferDecision.js'
import { Header } from './components/Header/Header.jsx'
import { NavRail } from './components/Header/NavRail.jsx'
import { EmergencyForm } from './components/Queue/EmergencyForm.jsx'
import { PriorityQueue } from './components/Queue/PriorityQueue.jsx'
import { AmbulancePanel } from './components/Dispatch/AmbulancePanel.jsx'
import { NetworkMap } from './components/Map/NetworkMap.jsx'
import { RoadControl } from './components/Simulation/RoadControl.jsx'
import { HospitalList } from './components/Hospital/HospitalList.jsx'
import { HospitalDecision } from './components/Hospital/HospitalDecision.jsx'
import { DecisionLog, EventLog } from './components/Decision/DecisionLog.jsx'

export default function App() {
  const [graph] = useState(() => generateGraph({ nodeCount: 200, edgePerNode: 4, seed: 42 }))
  const [hospitals, setHospitals] = useState(() => generateHospitals(graph, { seed: 99 }))
  const [doctors, setDoctors] = useState(() => {
    const h = generateHospitals(graph, { seed: 99 })
    const seedRef = { seed: 777 }
    return h.flatMap(hosp => generateDoctorsForHospital(hosp, seedRef))
  })
  const [ambulances] = useState(() => generateAmbulances([...graph.nodes.keys()], 8))
  const [queue] = useState(() => new EmergencyQueue())
  const [requests, setRequests] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [activeNav, setActiveNav] = useState('mission')
  const [simOpen, setSimOpen] = useState(false)
  const [form, setForm] = useState({
    originNode: '', urgency: 'Critical',
    requiredSpecialties: ['cardiology'], requiredEquipment: ['ventilator'],
    requiredMedicines: ['epinephrine'], requiresICU: true,
  })
  const [crossRegion, setCrossRegion] = useState(true)
  const [logs, setLogs] = useState([])
  const [decisions, setDecisions] = useState([])
  const [demoMode, setDemoMode] = useState(false)
  const [roadStatus, setRoadStatus] = useState({ id: '', status: 'CLOSED' })
  const [eventLog] = useState(() => createEventLog(50))

  const villageNodes = useMemo(() => [...graph.nodes.values()].filter(n => n.type === 'village').slice(0, 80), [graph])
  useEffect(() => { if (!form.originNode && villageNodes.length) setForm(f => ({ ...f, originNode: villageNodes[0].id })) }, [villageNodes, form.originNode])

  const selectedReq = requests.find(r => r.id === selectedId) || requests[0] || null
  const selection = useMemo(() => selectedReq ? selectHospital(selectedReq, hospitals, graph, doctors) : null, [selectedReq, hospitals, graph, doctors])
  const ambSelection = useMemo(() => selectedReq ? selectAmbulance(selectedReq, ambulances, graph, { crossRegion }) : null, [selectedReq, ambulances, graph, crossRegion])
  const transferDecision = useMemo(() => selectedReq ? compareTransferVsDelivery(selectedReq, hospitals, graph, doctors) : null, [selectedReq, hospitals, graph, doctors])
  const queueSorted = useMemo(() => queue.toSorted(), [requests, queue])
  const routeStats = useMemo(() => {
    if (!selectedReq || !selection?.selected) return null
    const target = selection.selected.nodeId
    const rD = decideRoute(graph, selectedReq.originNode, target, 'dijkstra')
    const rA = decideRoute(graph, selectedReq.originNode, target, 'astar')
    return { dijkstra: { ...rD, ms: rD.record.ms }, astar: { ...rA, ms: rA.record.ms } }
  }, [selectedReq, selection, graph])

  const handleCreate = () => {
    const id = `R${String(requests.length + 1).padStart(3, '0')}`
    const req = { id, originNode: form.originNode, urgency: form.urgency, requiredSpecialties: [...form.requiredSpecialties], requiredEquipment: [...form.requiredEquipment], requiredMedicines: [...form.requiredMedicines], requiresICU: form.requiresICU, createdAt: Date.now(), status: 'QUEUED' }
    queue.insert(req)
    setRequests([...requests, req])
    setSelectedId(id)
    const ambRes = decideAmbulance(req, ambulances, graph, { selectAmbulance, crossRegion })
    const hospRes = decideHospital(req, hospitals, graph, { selectHospital, doctors })
    eventLog.push('EMERGENCY_CREATED', req.id, { urgency: req.urgency })
    eventLog.push('AMBULANCE_ASSIGNED', req.id, ambRes.record)
    eventLog.push('HOSPITAL_SELECTED', req.id, hospRes.record)
    if (hospRes.selected) eventLog.push('ROUTE_CALCULATED', req.id, decideRoute(graph, req.originNode, hospRes.selected.nodeId, 'astar').record)
    setDecisions(d => [hospRes.record, ambRes.record, ...d].slice(0, 30))
    const node = graph.getNode(req.originNode)
    setLogs(l => [
      { ts: new Date().toLocaleTimeString(), type: 'EMERGENCY_CREATED', msg: `${id} ${req.urgency} @ ${node?.name || req.originNode}`, tone: 'blue' },
      { ts: new Date().toLocaleTimeString(), type: ambRes.record.decisionType, msg: ambRes.record.reason + ` [${ambRes.record.algorithm}]`, tone: ambRes.selected ? 'green' : 'red' },
      { ts: new Date().toLocaleTimeString(), type: hospRes.record.decisionType, msg: hospRes.record.reason + ` [${hospRes.record.algorithm}]`, tone: hospRes.selected ? 'green' : 'red' },
      ...l,
    ])
  }

  const handleDemoScenario = () => {
    const origins = villageNodes[2]?.id || 'n5'
    const demoHospitals = createDemoHospitals(hospitals.slice(0, 3).map(h => h.nodeId))
    setHospitals([...demoHospitals, ...hospitals.slice(3)])
    const seedRef = { seed: 888 }
    setDoctors(demoHospitals.flatMap(h => generateDoctorsForHospital(h, seedRef)))
    setDemoMode(true)
    const req = { id: `R${String(requests.length + 1).padStart(3, '0')}`, originNode: origins, urgency: 'Critical', requiredSpecialties: ['cardiology'], requiredEquipment: ['ventilator'], requiredMedicines: ['epinephrine'], requiresICU: true, createdAt: Date.now(), status: 'QUEUED' }
    queue.insert(req)
    setRequests(r => [...r, req])
    setSelectedId(req.id)
    setForm(f => ({ ...f, originNode: origins }))
    setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'DEMO', msg: `Demo: nearest lacks cardiologist, mid no ICU — far feasible wins`, tone: 'yellow' }, ...l])
  }

  const handleToggleHospital = (hid, patch) => setHospitals(hs => hs.map(h => h.id === hid ? { ...h, ...patch } : h))
  const handleRoadUpdate = () => {
    if (!roadStatus.id) return
    const edge = graph.getEdge(roadStatus.id)
    if (!edge) { setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'ROAD', msg: `Edge ${roadStatus.id} not found`, tone: 'red' }, ...l]); return }
    const old = edge.status
    graph.updateEdge(roadStatus.id, { status: roadStatus.status, trafficMultiplier: roadStatus.status === 'SLOW' ? 2.5 : 1 })
    const rec = { id: `DEC-${Date.now()}`, timestamp: Date.now(), requestId: roadStatus.id, decisionType: 'ROUTE_RECALCULATED', reason: `Edge ${roadStatus.id}: ${old} → ${roadStatus.status}`, algorithm: 'A*' }
    eventLog.push('ROUTE_RECALCULATED', roadStatus.id, rec)
    setDecisions(d => [rec, ...d].slice(0, 30))
    setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'ROUTE_RECALCULATED', msg: `Edge ${roadStatus.id}: ${old} → ${roadStatus.status} [A*]`, tone: 'yellow' }, ...l])
    setHospitals(h => [...h])
  }
  const handleReset = () => {
    const newH = generateHospitals(graph, { seed: Math.floor(Math.random() * 1000) })
    setHospitals(newH)
    const seedRef = { seed: Math.floor(Math.random() * 1000) }
    setDoctors(newH.flatMap(h => generateDoctorsForHospital(h, seedRef)))
    setRequests([]); setSelectedId(null); setLogs([]); setDecisions([]); eventLog.clear(); setDemoMode(false)
    for (const r of [...queue.toSorted()]) queue.remove(r.id)
  }

  return (
    <div className="min-h-screen bg-[#F4F8FA] text-[#16313F] flex flex-col">
      <Header graph={graph} hospitals={hospitals} ambulances={ambulances} onReset={handleReset} simOpen={simOpen} setSimOpen={setSimOpen} />
      <div className="flex flex-1">
        <NavRail active={activeNav} onChange={setActiveNav} />
        <div className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3 space-y-4">
            <EmergencyForm form={form} setForm={setForm} villageNodes={villageNodes} onCreate={handleCreate} onDemo={handleDemoScenario} demoMode={demoMode} crossRegion={crossRegion} setCrossRegion={setCrossRegion} />
            <PriorityQueue queueSorted={queueSorted} selectedReq={selectedReq} setSelectedId={setSelectedId} graph={graph} />
            <AmbulancePanel selectedReq={selectedReq} ambSelection={ambSelection} />
          </div>
          <div className="lg:col-span-5 space-y-4">
            <NetworkMap graph={graph} selection={selection} selectedReq={selectedReq} hospitals={hospitals} />
            <RoadControl graph={graph} roadStatus={roadStatus} setRoadStatus={setRoadStatus} onApply={handleRoadUpdate} routeStats={routeStats} />
            <HospitalList hospitals={hospitals} selection={selection} onToggle={handleToggleHospital} />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <HospitalDecision selectedReq={selectedReq} selection={selection} transferDecision={transferDecision} />
            <DecisionLog decisions={decisions} />
            <EventLog logs={logs} />
          </div>
        </div>
      </div>
      <footer className="border-t border-[#DCE7EC] py-3 text-center text-[11px] text-[#81949D] bg-white">Healthcare Command Center · deterministic routing · explainable decisions</footer>
    </div>
  )
}
