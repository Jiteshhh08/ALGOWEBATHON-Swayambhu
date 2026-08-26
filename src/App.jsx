import { useState, useMemo } from 'react'
import { dijkstra } from './lib/graph/dijkstra.js'
import { aStar } from './lib/graph/astar.js'
import { EmergencyQueue } from './lib/dispatch/priorityQueue.js'
import { generateAmbulances } from './lib/dispatch/ambulance.js'
import { selectAmbulance } from './lib/dispatch/selectAmbulance.js'
import { generateGraph } from './data/seed.js'

function buildInitial() {
  const graph = generateGraph({ nodeCount: 80, edgePerNode: 3, seed: 42 })
  const ids = [...graph.nodes.keys()]
  const ambulances = generateAmbulances(ids, 6)
  const queue = new EmergencyQueue()
  return { graph, ambulances, queue, ids }
}

export default function App() {
  const [{ graph, ambulances, queue, ids }] = useState(() => buildInitial())
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [log, setLog] = useState([])
  const [urgency, setUrgency] = useState('Critical')
  const [useAStar, setUseAStar] = useState(true)
  const [crossRegion, setCrossRegion] = useState(false)
  const [tick, setTick] = useState(0)

  const queueSorted = useMemo(() => queue.toSorted(), [requests, tick])
  const hospitals = useMemo(() => [...graph.nodes.values()].filter(n => n.type === 'hospital'), [graph])

  function addLog(msg) {
    setLog(l => [`${new Date().toLocaleTimeString()} — ${msg}`, ...l].slice(0, 30))
  }

  function addEmergency() {
    const origin = ids[Math.floor(Math.random() * ids.length)]
    const req = {
      id: `REQ-${Date.now().toString().slice(-5)}`,
      originNode: origin,
      urgency,
      createdAt: Date.now(),
      requiredEquipment: urgency === 'Critical' ? ['ventilator'] : ['oxygen'],
      requiredCapabilities: urgency === 'Critical' ? ['cardiac'] : ['basic'],
    }
    queue.insert(req)
    setRequests([...queue.toSorted()])
    addLog(`EMERGENCY ${req.id} ${urgency} at ${graph.getNode(origin)?.name}`)

    const t0 = performance.now()
    const result = selectAmbulance(req, ambulances, graph, { crossRegion })
    const t1 = performance.now()

    if (!result.selected) {
      setSelected({ req, result, route: null, time: (t1 - t0).toFixed(1) })
      addLog(`NO AMBULANCE for ${req.id} — ${result.reason}`)
      return
    }

    const dest = hospitals[Math.floor(Math.random() * hospitals.length)]?.id || ids[0]
    const routeRes = useAStar ? aStar(graph, req.originNode, dest) : dijkstra(graph, req.originNode, dest)
    setSelected({ req, result, route: { ...routeRes, dest }, time: (t1 - t0).toFixed(1) })
    if (routeRes.feasible) addLog(`DISPATCH ${result.selected.id} → ${graph.getNode(dest)?.name} ETA ${routeRes.distance.toFixed(1)}m`)

    // mark ambulance as busy for demo
    result.selected.status = 'DISPATCHING'
    result.selected.currentRequestId = req.id
    setTick(t => t + 1)
  }

  function handleRoadToggle() {
    const edgeIds = [...graph.edgeMap.keys()]
    const eid = edgeIds[Math.floor(Math.random() * edgeIds.length)]
    const edge = graph.getEdge(eid)
    const next = edge.status === 'CLOSED' ? 'OPEN' : edge.status === 'OPEN' ? 'CLOSED' : 'OPEN'
    graph.updateEdge(eid, { status: next })
    addLog(`ROAD ${eid} ${edge.source}→${edge.destination} → ${next}`)

    if (selected?.route?.edges?.includes(eid) && selected?.route?.feasible) {
      const dest = selected.route.dest
      const origin = selected.req.originNode
      const fresh = useAStar ? aStar(graph, origin, dest) : dijkstra(graph, origin, dest)
      if (!fresh.feasible) addLog(`ROUTE BLOCKED — no alternative from ${origin} to ${dest}`)
      else addLog(`ROUTE RECALCULATED A* — Old ${selected.route.distance.toFixed(1)}m → New ${fresh.distance.toFixed(1)}m`)
      setSelected(s => ({ ...s, route: { ...fresh, dest } }))
    }
    setTick(t => t + 1)
  }

  function reset() {
    queue.map.clear()
    queue.heap = []
    ambulances.forEach(a => { a.status = 'AVAILABLE'; a.currentRequestId = null })
    setRequests([])
    setSelected(null)
    setLog([])
    setTick(t => t + 1)
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold">Healthcare Command Center — Live Demo</h1>
          <p className="text-xs text-zinc-500">Graph {graph.nodeCount} nodes / {graph.edgeCount} edges • {ambulances.filter(a=>a.status==='AVAILABLE').length} available ambulances</p>
        </div>
        <div className="flex gap-2 text-xs">
          <label className="flex items-center gap-1"><input type="checkbox" checked={useAStar} onChange={e=>setUseAStar(e.target.checked)} /> A*</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={crossRegion} onChange={e=>setCrossRegion(e.target.checked)} /> cross-region</label>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-3 p-3 max-w-[1400px] mx-auto">
        {/* Queue */}
        <div className="col-span-3 bg-white rounded-xl border p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-sm">Priority Queue ({queue.size})</h2>
            <button onClick={() => setTick(t=>t+1)} className="text-xs border px-2 py-1 rounded">refresh</button>
          </div>

          <div className="flex gap-2">
            <select value={urgency} onChange={e=>setUrgency(e.target.value)} className="border rounded px-2 py-1.5 text-sm flex-1">
              <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <button onClick={addEmergency} className="bg-black text-white px-3 py-1.5 rounded text-sm">+ Add</button>
          </div>

          <div className="flex gap-2">
            <button onClick={handleRoadToggle} className="flex-1 border py-1.5 rounded text-sm">Toggle Road</button>
            <button onClick={reset} className="border py-1.5 px-3 rounded text-sm">Reset</button>
          </div>

          <div className="space-y-2 max-h-[55vh] overflow-auto">
            {queueSorted.length === 0 && <p className="text-xs text-zinc-400 text-center py-6">No emergencies — add one</p>}
            {queueSorted.map(r => {
              const wait = ((Date.now() - r.createdAt)/60000).toFixed(1)
              const color = r.urgency==='Critical'?'bg-red-500': r.urgency==='High'?'bg-orange-500': r.urgency==='Medium'?'bg-yellow-500':'bg-green-500'
              return (
                <div key={r.id} className="border rounded-lg p-2.5 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs font-medium">{r.id}</span>
                    <span className="text-[10px] ml-auto border px-1.5 py-0.5 rounded">{r.urgency}</span>
                  </div>
                  <div className="text-xs text-zinc-600">{graph.getNode(r.originNode)?.name} • wait {wait}m</div>
                  <div className="text-[11px] text-zinc-500">{r.requiredEquipment?.join(',')} • {r.requiredCapabilities?.join(',')}</div>
                </div>
              )
            })}
          </div>

          <div className="border-t pt-2">
            <h3 className="text-xs font-medium mb-1">Ambulances</h3>
            <div className="space-y-1 max-h-32 overflow-auto">
              {ambulances.map(a => (
                <div key={a.id} className="text-xs flex justify-between border rounded px-2 py-1">
                  <span>{a.id}</span>
                  <span className={a.status==='AVAILABLE'?'text-green-600':'text-zinc-500'}>{a.status}</span>
                  <span className="text-zinc-400">{a.location}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center - map placeholder + decision */}
        <div className="col-span-6 flex flex-col gap-3">
          <div className="bg-white rounded-xl border p-3">
            <h2 className="font-medium text-sm mb-2">Network Map (placeholder — Leaflet next)</h2>
            <div className="h-[280px] bg-zinc-100 rounded-lg border-2 border-dashed flex items-center justify-center text-xs text-zinc-500 p-4 text-center">
              Map will render villages/hospitals/route here.<br/>
              Current route: {selected?.route ? `${selected.route.path.join(' → ')} (${selected.route.distance.toFixed(1)}m)` : '— none yet'}
            </div>
            {selected && (
              <div className="mt-2 text-xs flex gap-2">
                <span className="border px-2 py-1 rounded">Algorithm: {useAStar?'A*':'Dijkstra'}</span>
                <span className="border px-2 py-1 rounded">Visited: {selected.route.visited}</span>
                <span className="border px-2 py-1 rounded">Dispatch: {selected.time}ms</span>
                <span className={`px-2 py-1 rounded ${selected.route.feasible?'bg-green-100':'bg-red-100'}`}>{selected.route.feasible?'feasible':'blocked'}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border p-3">
            <h2 className="font-medium text-sm mb-2">Decision Explanation</h2>
            {!selected && <p className="text-xs text-zinc-400">Add an emergency to see selection</p>}
            {selected && (
              <div className="text-xs space-y-2">
                <div><span className="font-medium">Request {selected.req.id}</span> — {selected.req.urgency} at {graph.getNode(selected.req.originNode)?.name}</div>
                <div className="border rounded p-2 bg-zinc-50">
                  <div className="font-medium">{selected.result.reason}</div>
                  {selected.result.selected && <div className="text-zinc-600">Ambulance {selected.result.selected.id} @ {selected.result.selected.location} • {selected.result.selected.equipment.join(', ')}</div>}
                  {selected.route && <div className="text-zinc-600">Route: {selected.route.path.join(' → ')} • {selected.route.edges.join(', ')}</div>}
                </div>
                <div>
                  <div className="font-medium">Candidates (sorted by ETA):</div>
                  <div className="mt-1 space-y-1 max-h-36 overflow-auto">
                    {selected.result.candidates.slice(0,6).map(c => (
                      <div key={c.amb.id} className={`flex justify-between border rounded px-2 py-1 ${c.feasible?'':'bg-zinc-50 text-zinc-400'}`}>
                        <span>{c.amb.id}</span><span>{c.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Log */}
        <div className="col-span-3 bg-white rounded-xl border p-3 flex flex-col">
          <h2 className="font-medium text-sm mb-2">Event Log</h2>
          <div className="space-y-1 max-h-[75vh] overflow-auto text-xs font-mono">
            {log.length===0 && <p className="text-zinc-400">No events yet</p>}
            {log.map((l,i)=>(<div key={i} className="border-b py-1">{l}</div>))}
          </div>
        </div>
      </div>
    </div>
  )
}
