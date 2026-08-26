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
import { invalidate, stats as cacheStats } from './lib/cache/routeCache.js'
import { Header } from './components/Header/Header.jsx'
import { NavRail } from './components/Header/NavRail.jsx'
import { EmergencyForm } from './components/Queue/EmergencyForm.jsx'
import { PriorityQueue } from './components/Queue/PriorityQueue.jsx'
import { AmbulancePanel } from './components/Dispatch/AmbulancePanel.jsx'
import { NetworkMap } from './components/Map/NetworkMap.jsx'
import { RoadControl } from './components/Simulation/RoadControl.jsx'
import { SimulationBar } from './components/Simulation/SimulationBar.jsx'
import { HospitalList } from './components/Hospital/HospitalList.jsx'
import { HospitalDecision } from './components/Hospital/HospitalDecision.jsx'
import { DecisionLog, EventLog } from './components/Decision/DecisionLog.jsx'
import { MetricsPanel, BenchmarkPanel } from './components/Analytics/MetricsPanel.jsx'
import { Scenarios } from './components/Simulation/Scenarios.jsx'
import { computeMetrics } from './lib/analytics/metrics.js'
import { runBenchmark } from './lib/analytics/benchmark.js'

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
  const metrics = useMemo(() => computeMetrics({ requests, hospitals, ambulances, routeStats }), [requests, hospitals, ambulances, routeStats])
  const benchmark = useMemo(() => requests.length ? runBenchmark(requests, hospitals, graph) : null, [requests, hospitals, graph])

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
    invalidate()
    const rec = { id: `DEC-${Date.now()}`, timestamp: Date.now(), requestId: roadStatus.id, decisionType: 'ROUTE_RECALCULATED', reason: `Edge ${roadStatus.id}: ${old} → ${roadStatus.status}`, algorithm: 'A*' }
    eventLog.push('ROUTE_RECALCULATED', roadStatus.id, rec)
    setDecisions(d => [rec, ...d].slice(0, 30))
    setLogs(l => [{ ts: new Date().toLocaleTimeString(), type: 'ROUTE_RECALCULATED', msg: `Edge ${roadStatus.id}: ${old} → ${roadStatus.status} [A*]`, tone: 'yellow' }, ...l])
    setHospitals(h => [...h])
  }
  const handleAddRandom = () => {
    const urg = ['Critical','High','Medium','Low'][Math.floor(Math.random()*4)]
    const origin = [...graph.nodes.values()].filter(n=>n.type==='village')[Math.floor(Math.random()*40)]?.id || villageNodes[0].id
    const req = { id: `R${String(requests.length+1).padStart(3,'0')}`, originNode: origin, urgency: urg, requiredSpecialties: urg==='Critical'?['cardiology']:['general'], requiredEquipment: urg==='Critical'?['ventilator']:['oxygen'], requiredMedicines: ['epinephrine'], requiresICU: urg==='Critical', createdAt: Date.now(), status:'QUEUED' }
    queue.insert(req)
    setRequests([...requests, req]); setSelectedId(req.id)
    const ambRes = decideAmbulance(req, ambulances, graph, { selectAmbulance, crossRegion })
    const hospRes = decideHospital(req, hospitals, graph, { selectHospital, doctors })
    eventLog.push('EMERGENCY_CREATED', req.id, { urgency: urg })
    eventLog.push('AMBULANCE_ASSIGNED', req.id, ambRes.record)
    eventLog.push('HOSPITAL_SELECTED', req.id, hospRes.record)
    setDecisions(d=>[hospRes.record, ambRes.record, ...d].slice(0,30))
    const node = graph.getNode(origin)
    setLogs(l=>[{ts:new Date().toLocaleTimeString(), type:'EMERGENCY_CREATED', msg:`${req.id} ${urg} @ ${node?.name}`, tone:'blue'}, ...l])
  }

  const handleScenarioA = () => {
    const origin = villageNodes[Math.floor(Math.random()*5)]?.id || villageNodes[0].id
    const req = { id:`R${String(requests.length+1).padStart(3,'0')}`, originNode: origin, urgency:'Critical', requiredSpecialties:['cardiology'], requiredEquipment:['ventilator'], requiredMedicines:['epinephrine'], requiresICU:true, createdAt: Date.now(), status:'QUEUED' }
    queue.insert(req); setRequests(r=>[...r, req]); setSelectedId(req.id)
    const ambRes = decideAmbulance(req, ambulances, graph, { selectAmbulance, crossRegion })
    const hospRes = decideHospital(req, hospitals, graph, { selectHospital, doctors })
    eventLog.push('SCENARIO_A', req.id, {...ambRes.record, ...hospRes.record})
    setDecisions(d=>[hospRes.record, ambRes.record, ...d].slice(0,30))
    setLogs(l=>[{ts:new Date().toLocaleTimeString(), type:'SCENARIO_A', msg:`A: Normal cardiac @ ${graph.getNode(origin)?.name} → ${hospRes.selected?.name || 'no hospital'}`, tone:'blue'}, ...l])
  }
  const handleScenarioB = () => {
    if (!selection?.bestDetail?.route?.edges?.length) { setLogs(l=>[{ts:new Date().toLocaleTimeString(), type:'SCENARIO_B', msg:'B: No active route — create emergency first', tone:'yellow'}, ...l]); return }
    const eid = selection.bestDetail.route.edges[Math.floor(selection.bestDetail.route.edges.length/2)]
    const e = graph.getEdge(eid); if (!e) return
    graph.updateEdge(eid, { status:'CLOSED' }); invalidate()
    const rec = { id:`DEC-${Date.now()}`, timestamp: Date.now(), requestId: eid, decisionType:'ROUTE_RECALCULATED', reason:`B: Road ${eid} closed on active route`, algorithm:'A*' }
    eventLog.push('ROAD_CLOSED', eid, rec); setDecisions(d=>[rec, ...d].slice(0,30))
    setLogs(l=>[{ts:new Date().toLocaleTimeString(), type:'SCENARIO_B', msg:`B: Closed ${eid} on route — recalculating`, tone:'yellow'}, ...l]); setHospitals(h=>[...h])
  }
  const handleScenarioD = () => {
    const target = hospitals[0]; if (!target) return
    handleToggleHospital(target.id, { bedsAvailable:0, icuAvailable:0, queueLength: target.queueLength+5 })
    setLogs(l=>[{ts:new Date().toLocaleTimeString(), type:'SCENARIO_D', msg:`D: Filled ${target.name} — beds 0, ICU 0`, tone:'yellow'}, ...l])
  }
  const handleScenarioE = () => {
    const target = hospitals[0]; if (!target) return
    handleToggleHospital(target.id, { medicineStock:{...target.medicineStock, epinephrine:0, insulin:0} })
    setLogs(l=>[{ts:new Date().toLocaleTimeString(), type:'SCENARIO_E', msg:`E: Medicine stockout at ${target.name}`, tone:'yellow'}, ...l])
  }
  const handleScenarioF = () => {
    ambulances.forEach((a,i)=>{ if(i<6) a.status='EN_ROUTE' }); setHospitals(h=>[...h])
    const req = { id:`R${String(requests.length+1).padStart(3,'0')}`, originNode: villageNodes[0].id, urgency:'Critical', requiredSpecialties:['cardiology'], requiredEquipment:['ventilator'], requiredMedicines:['epinephrine'], requiresICU:true, createdAt: Date.now(), status:'QUEUED' }
    queue.insert(req); setRequests(r=>[...r, req]); setSelectedId(req.id)
    const ambRes = decideAmbulance(req, ambulances, graph, { selectAmbulance, crossRegion:true })
    setLogs(l=>[{ts:new Date().toLocaleTimeString(), type:'SCENARIO_F', msg:`F: Fleet shortage — ${ambRes.reason}`, tone: ambRes.selected?'green':'red'}, ...l])
  }
  const handleCloseRandomRoad = () => {
    const eids = [...graph.edgeMap.keys()]
    const eid = eids[Math.floor(Math.random()*eids.length)]
    const e = graph.getEdge(eid)
    const next = e.status==='CLOSED'?'OPEN':'CLOSED'
    graph.updateEdge(eid, { status: next })
    invalidate()
    const rec = { id:`DEC-${Date.now()}`, timestamp: Date.now(), requestId: eid, decisionType:'ROAD_CLOSED', reason:`Random road ${eid}: ${e.status} → ${next}`, algorithm:'simulation' }
    eventLog.push('ROAD_CLOSED', eid, rec)
    setDecisions(d=>[rec, ...d].slice(0,30))
    setLogs(l=>[{ts:new Date().toLocaleTimeString(), type:'ROAD_CLOSED', msg:`Edge ${eid}: ${e.status} → ${next}`, tone:'yellow'}, ...l])
    setHospitals(h=>[...h])
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
        <div className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-4 py-4">
          <div className="mb-4 space-y-3">
            <SimulationBar onAddRandom={handleAddRandom} onCloseRoad={handleCloseRandomRoad} onReset={handleReset} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <MetricsPanel metrics={metrics} cache={cacheStats()} />
              <BenchmarkPanel benchmark={benchmark} />
            </div>
            <Scenarios onA={handleScenarioA} onB={handleScenarioB} onC={handleDemoScenario} onD={handleScenarioD} onE={handleScenarioE} onF={handleScenarioF} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
      </div>
      <footer className="border-t border-[#DCE7EC] py-3 text-center text-[11px] text-[#81949D] bg-white">Healthcare Command Center · deterministic routing · explainable decisions</footer>
    </div>
  )
}
