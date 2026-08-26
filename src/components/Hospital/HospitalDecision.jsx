import { Badge } from '../common/Badge.jsx'

export function HospitalDecision({ selectedReq, selection }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm mb-1">Hospital Selection</h2>
      <p className="text-[11px] text-slate-500 mb-3">Feasibility before optimization — hard filters then travel + queue + penalties</p>
      {!selectedReq ? <div className="text-xs text-slate-500 py-8 text-center border border-dashed border-slate-800 rounded">Create or select an emergency to see decision</div> :
        !selection ? <p className="text-xs text-slate-500">No selection</p> : (
          <div className="space-y-3">
            {selection.selected ? (
              <div className="p-3 rounded bg-green-950/25 border border-green-800">
                <div className="text-xs text-green-400 font-semibold">✓ SELECTED — {selection.selected.name}</div>
                <div className="text-xs text-green-200 mt-1">{selection.reason}</div>
                {selection.bestDetail?.breakdown && (
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
                    <div className="bg-black/30 rounded p-1.5">Travel <b>{selection.bestDetail.breakdown.travel}m</b></div>
                    <div className="bg-black/30 rounded p-1.5">Queue <b>{selection.bestDetail.breakdown.queueTime}m</b></div>
                    <div className="bg-black/30 rounded p-1.5">Bed <b>{selection.bestDetail.breakdown.bedPenalty}</b></div>
                    <div className="bg-black/30 rounded p-1.5">ICU <b>{selection.bestDetail.breakdown.icuPenalty}</b></div>
                    <div className="bg-black/30 rounded p-1.5">Med <b>{selection.bestDetail.breakdown.medicinePenalty}</b></div>
                    <div className="bg-black/30 rounded p-1.5 font-bold">Total <b>{selection.bestDetail.breakdown.total}</b></div>
                  </div>
                )}
                <div className="mt-2 text-[11px] text-slate-300">Route: {selection.bestDetail?.route?.path?.join(' → ') || '—'} · ETA {selection.bestDetail?.travelTime?.toFixed(1)}m</div>
              </div>
            ) : (
              <div className="p-3 rounded bg-red-950/30 border border-red-800 text-xs text-red-300">{selection.reason}</div>
            )}
            <div>
              <h3 className="text-xs font-semibold mb-1">All Candidates (sorted by total cost)</h3>
              <div className="space-y-1 max-h-56 overflow-auto pr-1">
                {selection.candidates.map(c=> (
                  <div key={c.hospital.id} className={`p-2 rounded text-xs border ${c.feasible?'border-slate-700 bg-slate-800':'border-red-900/50 bg-red-950/20'}`}>
                    <div className="flex justify-between font-medium">
                      <span>{c.hospital.name} <span className="text-slate-500">· {c.hospital.id}</span></span>
                      {c.feasible ? <Badge tone="green">{c.totalCost.toFixed(1)}</Badge> : <Badge tone="red">REJECT</Badge>}
                    </div>
                    <div className={c.feasible?'text-slate-300':'text-red-300'}>{c.reason}</div>
                    {!c.feasible && <div className="text-[11px] text-slate-500">{c.hospital.specialties.join(', ')} · beds {c.hospital.bedsAvailable}/{c.hospital.bedsTotal} · ICU {c.hospital.icuAvailable}</div>}
                  </div>
                ))}
              </div>
            </div>
            {selection.rejected.length>0 && (
              <div>
                <h3 className="text-xs font-semibold mb-1 text-red-300">Rejected — nearest would have been infeasible</h3>
                <div className="space-y-1">
                  {selection.rejected.map(r=> (
                    <div key={r.hospital.id} className="p-1.5 rounded bg-red-950/20 border border-red-800 text-xs flex justify-between">
                      <span>{r.hospital.name}</span><span className="text-red-300">{r.reason}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-amber-300 mt-2">Nearest ≠ best — system chooses feasible lowest-cost, not shortest distance.</p>
              </div>
            )}
          </div>
        )
      }
    </div>
  )
}
