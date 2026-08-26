export function RoadControl({ graph, roadStatus, setRoadStatus, onApply, routeStats }) {
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-2">Road Network Control</h2>
      <div className="flex gap-2 text-xs">
        <input placeholder="edge id e.g. e123" value={roadStatus.id} onChange={e=>setRoadStatus(s=>({...s, id:e.target.value}))} className="flex-1 bg-white border border-[#C7D7DE] rounded-[5px] px-2 py-1.5 text-[#16313F] placeholder:text-[#A8B6BC]" />
        <select value={roadStatus.status} onChange={e=>setRoadStatus(s=>({...s, status:e.target.value}))} className="bg-white border border-[#C7D7DE] rounded-[5px] px-2 text-[#16313F]">
          <option>CLOSED</option><option>SLOW</option><option>OPEN</option>
        </select>
        <button onClick={onApply} className="px-4 bg-[#123B5D] hover:bg-[#155A83] text-white rounded-[5px] font-semibold">Apply</button>
      </div>
      <p className="text-[11px] text-[#81949D] mt-2">Try closing an edge on the green route — then re-select request to see cost & ETA increase. Edges: {[...graph.edgeMap.keys()].slice(0,6).join(', ')} …</p>
      {routeStats && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-[6px] border border-[#DCE7EC] bg-[#F8FBFC]">
            <div className="flex justify-between font-semibold text-[#123B5D]"><span>Dijkstra</span><span className="font-mono text-[#58707B]">{routeStats.dijkstra.ms}ms</span></div>
            <div className="text-[#58707B]">{routeStats.dijkstra.feasible? `${routeStats.dijkstra.distance.toFixed(1)}m via ${routeStats.dijkstra.path.length} hops · visited ${routeStats.dijkstra.visited}`:'Infeasible'}</div>
          </div>
          <div className="p-2 rounded-[6px] border border-[#DCE7EC] bg-[#F8FBFC]">
            <div className="flex justify-between font-semibold text-[#123B5D]"><span>A*</span><span className="font-mono text-[#58707B]">{routeStats.astar.ms}ms</span></div>
            <div className="text-[#58707B]">{routeStats.astar.feasible? `${routeStats.astar.distance.toFixed(1)}m · visited ${routeStats.astar.visited} ${routeStats.astar.visited<=routeStats.dijkstra.visited?'✓ less':''}`:'Infeasible'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
