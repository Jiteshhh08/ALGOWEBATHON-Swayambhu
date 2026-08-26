export function NetworkMap({ graph, selection, selectedReq, hospitals }) {
  const nodes = [...graph.nodes.values()]
  if (nodes.length === 0) {
    return (
      <div className="panel p-4">
        <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-3">Network Map</h2>
        <div className="h-[280px] bg-[#F8FBFC] rounded-[6px] border border-[#DCE7EC] flex items-center justify-center text-[12px] text-[#81949D]">No nodes</div>
      </div>
    )
  }

  // Compute bounds dynamically so map never appears blank/off-screen
  const lats = nodes.map(n => n.lat)
  const lngs = nodes.map(n => n.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latRange = (maxLat - minLat) || 0.05
  const lngRange = (maxLng - minLng) || 0.05
  const pad = 0.08
  // ViewBox 0..100, map lng->x, lat->y (inverted)
  const toXY = (lat, lng) => {
    const x = ((lng - minLng) / lngRange) * (100 - pad * 200) + pad * 100
    const y = ((maxLat - lat) / latRange) * (100 - pad * 200 * 0.6) + pad * 60
    return [x, y]
  }

  const routePath = selection?.bestDetail?.route?.path || []
  const routeCoords = routePath.map(id => {
    const n = graph.getNode(id)
    if (!n) return null
    const [x, y] = toXY(n.lat, n.lng)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).filter(Boolean).join(' ')

  const selectedNode = selectedReq ? graph.getNode(selectedReq.originNode) : null
  const selXY = selectedNode ? toXY(selectedNode.lat, selectedNode.lng) : null

  // Draw faint edges for context (first 300)
  const edges = [...graph.edgeMap.values()].slice(0, 300)

  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-3 flex items-center justify-between">
        <span>Network Map</span>
        <span className="text-[11px] font-normal text-[#81949D]">{selection?.bestDetail?.route ? `${routePath.length} hops` : `${nodes.length} nodes`}</span>
      </h2>
      <div className="relative h-[280px] bg-[#F8FBFC] rounded-[6px] border border-[#DCE7EC] overflow-hidden">
        {/* subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(#16313F 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
        <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" className="w-full h-full relative">
          {/* roads */}
          {edges.map(e => {
            const a = graph.getNode(e.source)
            const b = graph.getNode(e.destination)
            if (!a || !b) return null
            const [x1, y1] = toXY(a.lat, a.lng)
            const [x2, y2] = toXY(b.lat, b.lng)
            const closed = e.status === 'CLOSED'
            const slow = e.status === 'SLOW'
            return <line key={e.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={closed ? '#D92D3A' : slow ? '#D88A16' : '#DCE7EC'} strokeWidth={closed ? 0.6 : 0.3} strokeDasharray={closed ? '1.2 1.2' : undefined} opacity={0.9} />
          })}
          {/* village nodes */}
          {nodes.filter(n => n.type !== 'hospital').slice(0, 400).map(n => {
            const [x, y] = toXY(n.lat, n.lng)
            const isSel = selectedReq?.originNode === n.id
            return <circle key={n.id} cx={x} cy={y} r={isSel ? 1.1 : 0.55} fill={isSel ? '#D92D3A' : '#A7DCF0'} stroke={isSel ? '#FFFFFF' : '#72C2E3'} strokeWidth={isSel ? 0.4 : 0.2} opacity={0.95} />
          })}
          {/* hospital nodes */}
          {hospitals.map(h => {
            const n = graph.getNode(h.nodeId)
            if (!n) return null
            const [x, y] = toXY(n.lat, n.lng)
            const isSelected = selection?.selected?.id === h.id
            const load = h.bedsAvailable / h.bedsTotal
            const fill = h.operatingStatus === 'CLOSED' ? '#81949D' : load < 0.15 ? '#D92D3A' : load < 0.4 ? '#D88A16' : '#1677A8'
            return (
              <g key={h.id}>
                {isSelected && <circle cx={x} cy={y} r={2.4} fill="none" stroke="#1677A8" strokeWidth={0.35} opacity={0.35} />}
                <circle cx={x} cy={y} r={isSelected ? 1.45 : 1.05} fill={fill} stroke="#FFFFFF" strokeWidth={0.45} />
                <text x={x} y={y - 1.8} textAnchor="middle" fontSize="1.7" fontWeight="700" fill="#123B5D" style={{ paintOrder: 'stroke', stroke: '#FFFFFF', strokeWidth: 0.5, strokeLinejoin: 'round' }}>{isSelected ? '●' : ''}</text>
              </g>
            )
          })}
          {/* active route */}
          {routeCoords && routePath.length > 1 && (
            <>
              <polyline fill="none" stroke="#218FC2" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" points={routeCoords} opacity={0.98} />
              <polyline fill="none" stroke="white" strokeWidth="0.45" strokeDasharray="1 1.4" className="route-pulse" points={routeCoords} opacity={0.9} />
            </>
          )}
          {/* selected emergency pulse */}
          {selXY && (
            <>
              <circle cx={selXY[0]} cy={selXY[1]} r="1.9" fill="none" stroke="#D92D3A" strokeWidth="0.5" opacity={selectedReq?.urgency === 'Critical' ? 0.95 : 0.5} />
              <circle cx={selXY[0]} cy={selXY[1]} r="0.95" fill="#D92D3A" stroke="#FFFFFF" strokeWidth="0.35" className={selectedReq?.urgency === 'Critical' ? 'pulse-dot' : ''} />
            </>
          )}
        </svg>

        {/* legend */}
        <div className="absolute bottom-2 left-2 text-[11px] bg-white/95 border border-[#DCE7EC] px-2 py-1 rounded-[5px] shadow-sm flex items-center flex-wrap gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1677A8] border border-white shadow-sm" /> Hospital</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#A7DCF0] border border-[#72C2E3]" /> Village</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#D92D3A] border border-white" /> Emergency</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-[3px] bg-[#218FC2] rounded" /> Route</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-[2px] bg-[#D92D3A] rounded" style={{ borderTop: '1px dashed #D92D3A' }} /> Closed</span>
        </div>

        {selectedNode && (
          <div className="absolute top-2 right-2 bg-white border border-[#DCE7EC] rounded-[6px] px-2.5 py-1.5 text-[11px] leading-tight shadow-sm max-w-[48%]">
            <div className="font-bold text-[#123B5D] truncate">{selectedReq?.id} · {selectedNode.name}</div>
            <div className="text-[#58707B] truncate">{selection?.selected ? `→ ${selection.selected.name} · ${selection.bestDetail?.travelTime?.toFixed(1) ?? '—'}m` : 'No hospital selected'}</div>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2"><div className="text-[#81949D] text-[11px]">Nodes</div><div className="font-mono font-bold text-[#123B5D]">{graph.nodeCount}</div></div>
        <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2"><div className="text-[#81949D] text-[11px]">Edges</div><div className="font-mono font-bold text-[#123B5D]">{graph.edgeCount}</div></div>
        <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2"><div className="text-[#81949D] text-[11px]">Hospitals</div><div className="font-mono font-bold text-[#123B5D]">{hospitals.length}</div></div>
      </div>
    </div>
  )
}
