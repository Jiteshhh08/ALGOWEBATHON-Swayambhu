export function NetworkMap({ graph, selection, selectedReq, hospitals }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm mb-3">Network Map</h2>
      <div className="relative h-[280px] bg-[#0f172a] rounded border border-slate-800 overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {[...graph.nodes.values()].slice(0, 400).map(n=> (
            <circle key={n.id} cx={((n.lng-74.5+2)*50)} cy={((19.8 - n.lat)*80)} r={n.type==='hospital'?2.2:0.9} fill={n.type==='hospital'? '#38bdf8' : '#64748b'} opacity={n.type==='hospital'?1:0.6} />
          ))}
          {selection?.bestDetail?.route?.path?.length>1 && (
            <polyline fill="none" stroke="#22c55e" strokeWidth="1.2" points={selection.bestDetail.route.path.map(pid=> { const n=graph.getNode(pid); return `${((n.lng-74.5+2)*50)},${((19.8 - n.lat)*80)}` }).join(' ')} />
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
  )
}
