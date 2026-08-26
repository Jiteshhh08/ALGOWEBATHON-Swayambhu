export function RoadControl({ graph, roadStatus, setRoadStatus, onApply, routeStats }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm mb-2">Road Network Control</h2>
      <div className="flex gap-2 text-xs">
        <input placeholder="edge id e.g. e123" value={roadStatus.id} onChange={e=>setRoadStatus(s=>({...s, id:e.target.value}))} className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5" />
        <select value={roadStatus.status} onChange={e=>setRoadStatus(s=>({...s, status:e.target.value}))} className="bg-slate-800 border border-slate-700 rounded px-2">
          <option>CLOSED</option><option>SLOW</option><option>OPEN</option>
        </select>
        <button onClick={onApply} className="px-3 bg-slate-700 hover:bg-slate-600 rounded">Apply</button>
      </div>
      <p className="text-[11px] text-slate-500 mt-2">Try closing an edge on the green route — then re-select request to see cost & ETA increase. Edges: {[...graph.edgeMap.keys()].slice(0,6).join(', ')} …</p>
      {routeStats && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded border border-slate-700 bg-slate-800">
            <div className="flex justify-between"><span>Dijkstra</span><span className="font-mono">{routeStats.dijkstra.ms}ms</span></div>
            <div className="text-slate-400">{routeStats.dijkstra.feasible? `${routeStats.dijkstra.distance.toFixed(1)}m via ${routeStats.dijkstra.path.length} hops · visited ${routeStats.dijkstra.visited}`:'Infeasible'}</div>
          </div>
          <div className="p-2 rounded border border-slate-700 bg-slate-800">
            <div className="flex justify-between"><span>A*</span><span className="font-mono">{routeStats.astar.ms}ms</span></div>
            <div className="text-slate-400">{routeStats.astar.feasible? `${routeStats.astar.distance.toFixed(1)}m · visited ${routeStats.astar.visited} ${routeStats.astar.visited<=routeStats.dijkstra.visited?'✓ less':''}`:'Infeasible'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
