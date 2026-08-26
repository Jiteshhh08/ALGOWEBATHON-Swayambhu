import { Badge } from '../common/Badge.jsx'

export function PriorityQueue({ queueSorted, selectedReq, setSelectedId, graph }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm mb-2">Priority Queue <span className="text-xs font-normal text-slate-400">({queueSorted.length})</span></h2>
      {queueSorted.length===0 ? <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-800 rounded">No emergencies — create one to see scoring</p> :
        <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
          {queueSorted.map(req=> {
            const isSel = selectedReq?.id===req.id
            const wait = Math.floor((Date.now()-req.createdAt)/60000)
            return (
              <button key={req.id} onClick={()=>setSelectedId(req.id)} className={`w-full text-left p-2.5 rounded border ${isSel?'bg-sky-950/40 border-sky-700':'bg-slate-800/60 border-slate-700 hover:border-slate-600'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">{req.id}</span>
                  <Badge tone={req.urgency==='Critical'?'red': req.urgency==='High'?'orange':req.urgency==='Medium'?'yellow':'slate'}>{req.urgency}</Badge>
                </div>
                <div className="text-xs text-slate-300 mt-1">{graph.getNode(req.originNode)?.name} · wait {wait}m</div>
                <div className="text-[11px] text-slate-400 truncate">{req.requiredSpecialties.join(', ')||'general'} {req.requiresICU?'· ICU':''} · {req.requiredMedicines.join(', ')||'no med'}</div>
              </button>
            )
          })}
        </div>
      }
    </div>
  )
}
