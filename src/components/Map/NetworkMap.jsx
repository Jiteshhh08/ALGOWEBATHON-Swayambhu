export function NetworkMap({ graph, selection, selectedReq, hospitals }) {
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-3">Network Map</h2>
      <div className="relative h-[280px] bg-[#F8FBFC] rounded-[6px] border border-[#DCE7EC] overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {[...graph.nodes.values()].slice(0, 400).map(n=> (
            <circle key={n.id} cx={((n.lng-74.5+2)*50)} cy={((19.8 - n.lat)*80)} r={n.type==='hospital'?2.2:0.9} fill={n.type==='hospital'? '#1677A8' : '#A8B6BC'} opacity={n.type==='hospital'?1:0.7} />
          ))}
          {selection?.bestDetail?.route?.path?.length>1 && (
            <polyline fill="none" stroke="#238B68" strokeWidth="1.4" className="route-pulse" points={selection.bestDetail.route.path.map(pid=> { const n=graph.getNode(pid); return `${((n.lng-74.5+2)*50)},${((19.8 - n.lat)*80)}` }).join(' ')} />
          )}
          {selectedReq && (
            <circle cx={((graph.getNode(selectedReq.originNode)?.lng-74.5+2)*50)} cy={((19.8 - graph.getNode(selectedReq.originNode)?.lat)*80)} r="3.5" fill="none" stroke="#D92D3A" strokeWidth="1.4" />
          )}
        </svg>
        <div className="absolute bottom-2 left-2 text-[11px] bg-white/95 border border-[#DCE7EC] px-2 py-1 rounded-[5px] shadow-subtle flex items-center">
          <span className="inline-block w-2 h-2 bg-[#1677A8] rounded-full mr-1"></span>Hospital
          <span className="inline-block w-2 h-2 bg-[#A8B6BC] rounded-full ml-3 mr-1"></span>Village
          <span className="inline-block w-2 h-2 border border-[#D92D3A] bg-white rounded-full ml-3 mr-1"></span>Emergency
          <span className="inline-block w-3 h-0.5 bg-[#238B68] ml-3 mr-1"></span>Route
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2"><div className="text-[#81949D] text-[11px]">Nodes</div><div className="font-mono font-bold text-[#123B5D]">{graph.nodeCount}</div></div>
        <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2"><div className="text-[#81949D] text-[11px]">Edges</div><div className="font-mono font-bold text-[#123B5D]">{graph.edgeCount}</div></div>
        <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2"><div className="text-[#81949D] text-[11px]">Hospitals</div><div className="font-mono font-bold text-[#123B5D]">{hospitals.length}</div></div>
      </div>
    </div>
  )
}
