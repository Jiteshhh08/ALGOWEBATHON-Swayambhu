import { Badge } from '../common/Badge.jsx'

export function PriorityQueue({ queueSorted, selectedReq, setSelectedId, graph }) {
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-2">Priority Queue <span className="text-xs font-normal text-[#81949D]">({queueSorted.length})</span></h2>
      {queueSorted.length===0 ? <p className="text-xs text-[#A8B6BC] py-6 text-center border border-dashed border-[#DCE7EC] rounded">No emergencies — create one to see scoring</p> :
        <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
          {queueSorted.map(req=> {
            const isSel = selectedReq?.id===req.id
            const wait = Math.floor((Date.now()-req.createdAt)/60000)
            return (
              <button key={req.id} onClick={()=>setSelectedId(req.id)} className={`w-full text-left p-2.5 rounded-[6px] border text-left ${isSel?'bg-[#EAF7FC] border-[#218FC2]':'bg-white border-[#DCE7EC] hover:border-[#C7D7DE]'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#123B5D]">{req.id}</span>
                  <Badge tone={req.urgency==='Critical'?'red': req.urgency==='High'?'orange':req.urgency==='Medium'?'yellow':'slate'}>{req.urgency}</Badge>
                </div>
                <div className="text-xs text-[#285466] mt-1">{graph.getNode(req.originNode)?.name} · wait {wait}m</div>
                <div className="text-[11px] text-[#81949D] truncate">{req.requiredSpecialties.join(', ')||'general'} {req.requiresICU?'· ICU':''} · {req.requiredMedicines.join(', ')||'no med'}</div>
              </button>
            )
          })}
        </div>
      }
    </div>
  )
}
