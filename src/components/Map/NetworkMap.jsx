import { useState, useRef, useCallback, useMemo } from 'react'
import { dijkstra } from '../../lib/graph/dijkstra.js'

export function NetworkMap({ graph, selection, selectedReq, hospitals, ambulances, ambSelection }) {
  const nodes = useMemo(() => [...graph.nodes.values()], [graph])
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const rafRef = useRef(0)
  const pendingPan = useRef(null)

  const MIN_SCALE = 0.7
  const MAX_SCALE = 5
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
  const zoomTo = useCallback((nextScale) => {
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE)
    setScale(s)
    if (s <= 0.9) setPan({ x: 0, y: 0 })
  }, [])

  const schedulePan = useCallback((nx, ny) => {
    pendingPan.current = { x: clamp(nx, -22, 22), y: clamp(ny, -14, 14) }
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      if (pendingPan.current) setPan(pendingPan.current)
      rafRef.current = 0
    })
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const vbW = 100 / scale, vbH = 60 / scale
    const vbX = 50 - vbW / 2 - pan.x, vbY = 30 - vbH / 2 - pan.y
    const cx = vbX + ((e.clientX - rect.left) / rect.width) * vbW
    const cy = vbY + ((e.clientY - rect.top) / rect.height) * vbH
    const factor = e.deltaY < 0 ? 1.10 : 0.91
    const next = clamp(scale * factor, MIN_SCALE, MAX_SCALE)
    if (next === scale) return
    const nextW = 100 / next, nextH = 60 / next
    const nx = cx - ((e.clientX - rect.left) / rect.width) * nextW
    const ny = cy - ((e.clientY - rect.top) / rect.height) * nextH
    setScale(next)
    setPan({ x: clamp(50 - nextW / 2 - nx, -18, 18), y: clamp(30 - nextH / 2 - ny, -12, 12) })
  }, [scale, pan])

  const handleMouseDown = (e) => { if (e.button!==0) return; setIsDragging(true); setDragStart({ x: e.clientX - pan.x*14, y: e.clientY - pan.y*14 }) }
  const handleMouseMove = (e) => {
    if (!isDragging) return
    const nx = (e.clientX - dragStart.x) / 14
    const ny = (e.clientY - dragStart.y) / 14
    const damp = scale < 1.2 ? 0.35 : 1
    schedulePan(nx*damp, ny*damp)
  }
  const handleMouseUp = () => { setIsDragging(false); if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current=0; if(pendingPan.current) setPan(pendingPan.current) } }
  const pinchRef = useRef({dist:0,scale:1})
  const handleTouchStart=(e)=>{ if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); pinchRef.current={dist:d,scale}} else if(e.touches.length===1){setIsDragging(true); setDragStart({x:e.touches[0].clientX-pan.x*14,y:e.touches[0].clientY-pan.y*14})}}
  const handleTouchMove=(e)=>{ if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); const f=d/(pinchRef.current.dist||d); zoomTo(pinchRef.current.scale*f)} else if(e.touches.length===1&&isDragging){ schedulePan((e.touches[0].clientX-dragStart.x)/14, (e.touches[0].clientY-dragStart.y)/14)}}
  const handleTouchEnd=()=>{ setIsDragging(false); if(rafRef.current){cancelAnimationFrame(rafRef.current); rafRef.current=0} }

  if (nodes.length===0) return <div className="panel p-4"><h2 className="font-semibold text-[13px] text-[#123B5D] mb-3">Network Map</h2><div className="h-[360px] bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] flex items-center justify-center text-[12px] text-[#81949D]">No nodes</div></div>

  const lats = useMemo(()=>nodes.map(n=>n.lat),[nodes]), lngs=useMemo(()=>nodes.map(n=>n.lng),[nodes])
  const minLat=Math.min(...lats), maxLat=Math.max(...lats), minLng=Math.min(...lngs), maxLng=Math.max(...lngs)
  const latRange=(maxLat-minLat)||0.05, lngRange=(maxLng-minLng)||0.05
  const pad=0.08
  const toXY = useCallback((lat,lng)=>[((lng-minLng)/lngRange)*(100-pad*200)+pad*100, ((maxLat-lat)/latRange)*(100-pad*200*0.62)+pad*60],[minLng,lngRange,maxLat,latRange])

  const routePath = selection?.bestDetail?.route?.path || []
  const routeCoords = useMemo(()=> routePath.map(id=>{const n=graph.getNode(id); if(!n) return null; const [x,y]=toXY(n.lat,n.lng); return `${x.toFixed(2)},${y.toFixed(2)}`}).filter(Boolean).join(' '),[routePath, graph, toXY])
  const selectedNode = selectedReq?graph.getNode(selectedReq.originNode):null
  const selXY = selectedNode?toXY(selectedNode.lat, selectedNode.lng):null
  // Simple ambulance → village route for simulation (decent speed, stops at village)
  const ambRoute = useMemo(()=>{
    if (!ambSelection?.selected || !selectedReq) return null
    try {
      const r = dijkstra(graph, ambSelection.selected.location, selectedReq.originNode)
      return r.feasible ? r : null
    } catch { return null }
  }, [ambSelection?.selected?.location, ambSelection?.selected?.id, selectedReq?.originNode, graph])
  const ambRouteCoords = useMemo(()=>{
    if (!ambRoute?.path?.length) return ''
    return ambRoute.path.map(id=>{const n=graph.getNode(id); if(!n) return null; const [x,y]=toXY(n.lat,n.lng); return `${x.toFixed(2)},${y.toFixed(2)}`}).filter(Boolean).join(' ')
  }, [ambRoute, graph, toXY])

  const edgeList = useMemo(()=>[...graph.edgeMap.values()], [graph])
  const sortedEdges = useMemo(()=> [...edgeList].sort((a,b)=> (a.status==='CLOSED'&&b.status!=='CLOSED')?1:(b.status==='CLOSED'&&a.status!=='CLOSED')?-1:0).slice(0, scale < 1.1 ? 280 : 420), [edgeList, scale])
  const villageNodes = useMemo(()=> nodes.filter(n=>n.type!=='hospital'), [nodes])

  const vbW=100/scale, vbH=60/scale, vbX=50-vbW/2-pan.x, vbY=30-vbH/2-pan.y
  const viewBox=`${vbX.toFixed(2)} ${vbY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}`
  const rs=1/Math.sqrt(scale)
  const ambEta = ambRoute?.distance ?? ambSelection?.candidates?.find(c=>c.amb.id===ambSelection?.selected?.id)?.eta ?? selection?.bestDetail?.travelTime ?? 10
  const vanDur = Math.max(2.2, Math.min(4.2, (ambEta||10)*0.28))

  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#238B68] animate-pulse" /> Network Map</span>
        <span className="text-[11px] font-normal text-[#81949D]">{routePath.length?`${routePath.length} hops · ${selection.bestDetail.travelTime.toFixed(1)} min`:`${nodes.length} nodes · ${edgeList.length} roads`}</span>
      </h2>
      <div ref={containerRef} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        className={`relative h-[380px] bg-[#F1F7F9] rounded-[6px] border border-[#DCE7EC] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] select-none ${isDragging?'cursor-grabbing':'cursor-grab'}`} title="Scroll to zoom · drag to pan · pinch on touch">
        <div className="absolute inset-0 bg-[#F8FBFC]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'radial-gradient(circle at 1px 1px, #16313F 1px, transparent 0)', backgroundSize:'18px 18px'}} />
        <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse at center, transparent 65%, rgba(22,49,63,0.06))'}} />
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="w-full h-full relative" style={{willChange:'transform'}}>
          <defs><filter id="shadow-sm" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0.3" stdDeviation="0.3" floodColor="#16313F" floodOpacity="0.18"/></filter></defs>
          {sortedEdges.map(e=>{const a=graph.getNode(e.source), b=graph.getNode(e.destination); if(!a||!b) return null; const [x1,y1]=toXY(a.lat,a.lng), [x2,y2]=toXY(b.lat,b.lng); const isClosed=e.status==='CLOSED', isSlow=e.status==='SLOW', isRoute=selection?.bestDetail?.route?.edges?.includes(e.id); if(isRoute) return null; return <line key={e.id+':casing'} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isClosed?'#FDECEE':'white'} strokeWidth={(isClosed?1.0:isSlow?0.85:0.72)*rs} strokeLinecap="round" opacity={isClosed?0.9:0.95}/>} )}
          {sortedEdges.map(e=>{const a=graph.getNode(e.source), b=graph.getNode(e.destination); if(!a||!b) return null; const [x1,y1]=toXY(a.lat,a.lng), [x2,y2]=toXY(b.lat,b.lng); const isClosed=e.status==='CLOSED', isSlow=e.status==='SLOW', isRoute=selection?.bestDetail?.route?.edges?.includes(e.id); if(isRoute) return null; return <line key={e.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isClosed?'#D92D3A':isSlow?'#D88A16':'#DCE7EC'} strokeWidth={(isClosed?0.52:isSlow?0.42:0.32)*rs} strokeLinecap="round" strokeDasharray={isClosed?`${0.9*rs} ${0.7*rs}`:isSlow?`${1.2*rs} ${0.6*rs}`:undefined} opacity={isClosed?1:isSlow?0.95:0.9}/>} )}
          {routeCoords && routePath.length>1 && (
            <>
              <polyline fill="none" stroke="white" strokeWidth={1.9*rs} strokeLinecap="round" strokeLinejoin="round" points={routeCoords} opacity={0.95}/>
              <polyline fill="none" stroke="#1677A8" strokeWidth={0.85*rs} strokeLinecap="round" strokeLinejoin="round" points={routeCoords} opacity={0.98}/>
              <polyline fill="none" stroke="white" strokeWidth={0.38*rs} strokeDasharray={`${0.9*rs} ${1.1*rs}`} className="route-pulse" strokeLinecap="round" points={routeCoords} opacity={0.95}/>
              {routePath.slice(0,-1).map((pid,i)=>{ if(i%2!==0) return null; const a=graph.getNode(pid), b=graph.getNode(routePath[i+1]); if(!a||!b) return null; const [x1,y1]=toXY(a.lat,a.lng), [x2,y2]=toXY(b.lat,b.lng); const mx=(x1+x2)/2, my=(y1+y2)/2, ang=Math.atan2(y2-y1,x2-x1)*180/Math.PI; return <g key={pid+':arrow'} transform={`translate(${mx},${my}) rotate(${ang})`}><path d="M -0.55 -0.22 L 0 0 L -0.55 0.22" fill="none" stroke="white" strokeWidth={0.22*rs} strokeLinecap="round" strokeLinejoin="round" opacity={0.95}/></g>})}
              {(()=>{const s=graph.getNode(routePath[0]), eN=graph.getNode(routePath[routePath.length-1]); if(!s||!eN) return null; const [sx,sy]=toXY(s.lat,s.lng), [ex,ey]=toXY(eN.lat,eN.lng); return <><circle cx={sx} cy={sy} r={0.9*rs} fill="white" stroke="#1677A8" strokeWidth={0.28*rs}/><circle cx={sx} cy={sy} r={0.45*rs} fill="#1677A8"/><circle cx={ex} cy={ey} r={0.9*rs} fill="white" stroke="#238B68" strokeWidth={0.28*rs}/><circle cx={ex} cy={ey} r={0.45*rs} fill="#238B68"/></>})()}
            </>
          )}
          {/* moving ambulance → village (simple, decent speed, reaches village) */}
          {ambRouteCoords && ambRoute?.path?.length > 1 && (
            <g key={`${selectedReq?.id}-${ambSelection?.selected?.id}-${ambRoute.path[0]}`}>
              <g transform="scale(1.9)">
                <g transform="translate(-0.78, -0.48)">
                  <rect x={-0} y={-0} width={1.56} height={0.95} rx={0.18} fill="#1677A8" stroke="white" strokeWidth={0.32}/>
                  <path d="M 0.38 -0.0 L 0.78 0.34 L 0.78 0.95 L 0.38 0.95 Z" fill="white" opacity={0.96}/>
                  <rect x={0.46} y={0.24} width={0.20} height={0.28} rx={0.04} fill="#1677A8" opacity={0.9}/>
                  <g transform="translate(-0.18,0.48)"><rect x={-0.09} y={-0.22} width={0.18} height={0.44} rx={0.03} fill="white"/><rect x={-0.22} y={-0.09} width={0.44} height={0.18} rx={0.03} fill="white"/></g>
                  <circle cx={-0.38} cy={0.99} r={0.18} fill="#16313F" stroke="white" strokeWidth={0.14}/><circle cx={0.38} cy={0.99} r={0.18} fill="#16313F" stroke="white" strokeWidth={0.14}/><circle cx={-0.38} cy={0.99} r={0.06} fill="white"/><circle cx={0.38} cy={0.99} r={0.06} fill="white"/>
                  <circle cx={0.62} cy={-0.12} r={0.14} fill="#FDECEE" stroke="#D92D3A" strokeWidth={0.10}><animate attributeName="opacity" values="1;0.3;1" dur="0.9s" repeatCount="indefinite"/></circle>
                </g>
              </g>
              <animateMotion path={`M ${ambRouteCoords.split(' ').join(' L ')}`} dur={`${vanDur}s`} repeatCount="1" rotate="auto" calcMode="linear" fill="freeze" />
            </g>
          )}
          {villageNodes.slice(0, scale < 1.1 ? 280 : 420).map(n=>{const [x,y]=toXY(n.lat,n.lng); const isOrigin=selectedReq?.originNode===n.id; const s=1.85; return <g key={n.id} transform={`translate(${x},${y}) scale(${s})`}><path d="M -0.62 0.18 L 0 -0.58 L 0.62 0.18 Z" fill={isOrigin?'#FDECEE':'white'} stroke={isOrigin?'#D92D3A':'#C7D7DE'} strokeWidth={(isOrigin?0.24:0.18)*rs/s} strokeLinejoin="round"/><rect x={-0.48} y={0.18} width={0.96} height={0.52} rx={0.09} fill={isOrigin?'#D92D3A':'#EAF7FC'} stroke={isOrigin?'#B91C1C':'#72C2E3'} strokeWidth={(isOrigin?0.22:0.16)*rs/s}/><rect x={-0.15} y={0.32} width={0.30} height={0.38} rx={0.05} fill={isOrigin?'white':'#72C2E3'} opacity={isOrigin?0.95:0.9}/>{isOrigin && <><circle r={1.65} fill="none" stroke="#D92D3A" strokeWidth={0.28*rs/s} opacity={0.22}/><circle r={1.15} fill="none" stroke="#D92D3A" strokeWidth={0.18*rs/s} opacity={0.35}/></>}</g>})}
          {hospitals.map(h=>{const n=graph.getNode(h.nodeId); if(!n) return null; const [x,y]=toXY(n.lat,n.lng); const isSelected=selection?.selected?.id===h.id; const load=h.bedsTotal?h.bedsAvailable/h.bedsTotal:1; const closed=h.operatingStatus==='CLOSED'; const fill=closed?'#81949D':load<0.15?'#D92D3A':load<0.4?'#D88A16':'#1677A8'; const stroke=closed?'#6E858F':load<0.15?'#B91C1C':load<0.4?'#A05A0A':'#123B5D'; const s=1.85; return <g key={h.id} transform={`translate(${x},${y}) scale(${s})`}><rect x={-1.0} y={-1.0} width={2.0} height={2.0} rx={0.28} fill={fill} stroke="white" strokeWidth={0.38*rs/s}/><rect x={-1.0} y={-1.0} width={2.0} height={2.0} rx={0.28} fill="none" stroke={stroke} strokeWidth={0.18*rs/s} opacity={0.9}/><rect x={-0.12} y={-0.52} width={0.24} height={1.04} rx={0.05} fill="white" opacity={closed?0.7:1}/><rect x={-0.52} y={-0.12} width={1.04} height={0.24} rx={0.05} fill="white" opacity={closed?0.7:1}/><circle cx={0.78} cy={-0.78} r={0.28} fill={closed?'#FDECEE':load<0.4?'#FFF5E5':'#EAF7F2'} stroke={fill} strokeWidth={0.14*rs/s}/><circle cx={0.78} cy={-0.78} r={0.12} fill={fill}/>{closed && <path d="M -0.55 0.55 L 0.55 -0.55 M 0.55 0.55 L -0.55 -0.55" stroke="white" strokeWidth={0.26*rs/s} strokeLinecap="round" opacity={0.9}/>}{isSelected && <g transform="translate(0,-1.55)"><rect x={-1.45} y={-0.42} width={2.9} height={0.7} rx={0.22} fill="#123B5D"/><text x={0} y={0.08} textAnchor="middle" fontSize={0.42} fontWeight="700" fill="white">HOSPITAL</text></g>}</g>})}
          {(ambulances||[]).map(a=>{const n=graph.getNode(a.location); if(!n) return null; const [x,y]=toXY(n.lat,n.lng); const isSel=ambSelection?.selected?.id===a.id; const col=a.status==='AVAILABLE'?'#238B68':a.status==='EN_ROUTE'||a.status==='DISPATCHING'?'#1677A8':a.status==='MAINTENANCE'?'#D88A16':'#81949D'; const dim= a.status==='AVAILABLE'?1.75:1.55; return <g key={a.id} transform={`translate(${x},${y})`}><rect x={-0.78*dim} y={-0.52*dim} width={1.56*dim} height={0.95*dim} rx={0.18} fill={col} stroke="white" strokeWidth={0.28*rs/dim}/><path d={`M ${0.38*dim} ${-0.52*dim} L ${0.78*dim} ${-0.18*dim} L ${0.78*dim} ${0.43*dim} L ${0.38*dim} ${0.43*dim} Z`} fill="white" opacity={0.95}/><rect x={0.46*dim} y={-0.28*dim} width={0.20*dim} height={0.30*dim} rx={0.04} fill={col} opacity={0.9}/><g transform={`translate(${-0.18*dim},${-0.04*dim})`}><rect x={-0.09} y={-0.22} width={0.18} height={0.44} rx={0.03} fill="white"/><rect x={-0.22} y={-0.09} width={0.44} height={0.18} rx={0.03} fill="white"/></g><circle cx={-0.38*dim} cy={0.48*dim} r={0.18*dim} fill="#16313F" stroke="white" strokeWidth={0.14*rs/dim}/><circle cx={0.38*dim} cy={0.48*dim} r={0.18*dim} fill="#16313F" stroke="white" strokeWidth={0.14*rs/dim}/><circle cx={-0.38*dim} cy={0.48*dim} r={0.06*dim} fill="white"/><circle cx={0.38*dim} cy={0.48*dim} r={0.06*dim} fill="white"/>{(a.status==='EN_ROUTE'||a.status==='DISPATCHING') && <circle cx={0.62*dim} cy={-0.62*dim} r={0.18*dim} fill="#FDECEE" stroke="#D92D3A" strokeWidth={0.12*rs/dim}><animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/></circle>}</g>})}
          {selXY && <g transform={`translate(${selXY[0]},${selXY[1]}`}><circle r={2.1} fill="none" stroke={selectedReq?.urgency==='Critical'?'#D92D3A':'#D88A16'} strokeWidth={0.5*rs} opacity={selectedReq?.urgency==='Critical'?0.35:0.25}/>{selectedReq?.urgency==='Critical' && <circle r={2.65} fill="none" stroke="#D92D3A" strokeWidth={0.28*rs} opacity={0.18}><animate attributeName="r" values="2.1;2.9;2.1" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.28;0;0.28" dur="1.6s" repeatCount="indefinite"/></circle>}</g>}
        </svg>
        {(ambRoute || selection?.selected) && (ambRouteCoords || routePath.length>1) && (
          <div className="absolute bottom-0 left-0 right-0 h-[24px] bg-[#123B5D]/90 backdrop-blur flex items-center gap-2 px-3 text-[10px] font-bold tracking-wide text-white">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse"/> AMBULANCE {ambSelection?.selected?.id || 'AMB-??'} • EN ROUTE <span className="hidden sm:inline text-white/60">•</span> <span className="hidden sm:inline font-normal text-[#A7DCF0] truncate">{ambSelection?.selected?.location ? `${graph.getNode(ambSelection.selected.location)?.name || ambSelection.selected.location} → ` : ''}{graph.getNode(selectedReq?.originNode)?.name || 'Village'}</span>
            <span className="ml-auto flex items-center gap-2"><span className="hidden md:inline font-normal text-white/70">ETA</span> <span className="bg-white text-[#123B5D] px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">{(ambRoute?.distance ?? selection.bestDetail?.travelTime ?? 0).toFixed(1)} min</span> <span className="w-14 h-1.5 bg-white/20 rounded-full overflow-hidden hidden sm:block"><span className="block h-full bg-[#4ADE80] rounded-full" style={{animation:`shuttle ${vanDur}s linear 1 forwards`, width:'100%'}}/></span></span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <button onClick={()=>zoomTo(scale*1.32)} className="w-8 h-8 bg-white border border-[#C7D7DE] rounded-[5px] flex items-center justify-center text-[#123B5D] hover:bg-[#F8FBFC] shadow-sm text-[16px] font-bold">＋</button>
          <button onClick={()=>zoomTo(scale*0.76)} className="w-8 h-8 bg-white border border-[#C7D7DE] rounded-[5px] flex items-center justify-center text-[#123B5D] hover:bg-[#F8FBFC] shadow-sm text-[16px] font-bold">−</button>
          <button onClick={()=>{setScale(1); setPan({x:0,y:0})}} className="w-8 h-8 bg-white border border-[#C7D7DE] rounded-[5px] flex items-center justify-center text-[#58707B] hover:bg-[#F8FBFC] shadow-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></button>
          <div className="w-8 bg-[#123B5D] text-white text-[9px] font-bold text-center py-1 rounded-[5px]">{Math.round(scale*100)}%</div>
        </div>
        <div className="absolute top-2 left-12 hidden sm:flex items-center gap-1 text-[10px] bg-white/90 backdrop-blur border border-[#DCE7EC] px-2 py-1 rounded-full shadow-sm text-[#58707B]">scroll zoom · drag pan · pinch</div>
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="pointer-events-auto text-[11px] bg-white/96 backdrop-blur border border-[#DCE7EC] px-2.5 py-1.5 rounded-[6px] shadow-sm flex items-center flex-wrap gap-x-3.5 gap-y-1 leading-none">
            <span className="inline-flex items-center gap-1.5"><span className="inline-flex w-[14px] h-[14px] rounded-[3px] bg-[#1677A8] border border-white shadow-sm items-center justify-center text-[7px] text-white font-bold">+</span> Hospital</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-[12px] h-[10px] bg-[#EAF7FC] border border-[#72C2E3] rounded-[2px] flex items-center justify-center text-[6px] text-[#1677A8]">⌂</span> Village</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-[14px] h-[9px] rounded-[2px] bg-[#238B68] border border-white shadow-sm inline-block"/> Ambulance</span>
          </div>
          <div className="hidden md:inline-flex text-[10px] bg-[#123B5D] text-white px-2.5 py-1 rounded-full">LIVE • {edgeList.length} roads</div>
        </div>
        {selectedNode && <div className="absolute top-2 right-2 bg-white border border-[#C7D7DE] rounded-[6px] px-3 py-2 text-[11px] leading-tight shadow-sm max-w-[46%] pointer-events-none"><div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${selectedReq?.urgency==='Critical'?'bg-[#D92D3A] animate-pulse':'bg-[#D88A16]'}`}/><span className="font-bold text-[#123B5D]">{selectedReq?.id} · {selectedNode.name}</span></div><div className="text-[#58707B] mt-0.5 truncate">{selection?.selected?<><span className="inline-flex w-3 h-3 rounded-[2px] bg-[#1677A8] text-white items-center justify-center text-[6px]">+</span> {selection.selected.name} · <span className="font-semibold text-[#1677A8]">{selection.bestDetail?.travelTime?.toFixed(1) ?? '—'} min</span></>:<span className="text-[#D92D3A]">No feasible hospital</span>}</div></div>}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2"><div className="text-[#81949D] text-[11px]">Nodes</div><div className="font-mono font-bold text-[#123B5D]">{graph.nodeCount}</div></div><div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2"><div className="text-[#81949D] text-[11px]">Edges</div><div className="font-mono font-bold text-[#123B5D]">{graph.edgeCount}</div></div><div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2"><div className="text-[#81949D] text-[11px]">Hospitals</div><div className="font-mono font-bold text-[#123B5D]">{hospitals.length}</div></div></div>
    </div>
  )
}
