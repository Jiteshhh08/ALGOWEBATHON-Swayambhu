import { Badge } from '../common/Badge.jsx'

export function HospitalDecision({ selectedReq, selection, transferDecision }) {
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-1">Hospital Selection</h2>
      <p className="text-[11px] text-[#81949D] mb-3">Feasibility before optimization — hard filters then travel + queue + penalties</p>
      {!selectedReq ? <div className="text-xs text-[#A8B6BC] py-8 text-center border border-dashed border-[#DCE7EC] rounded">Create or select an emergency to see decision</div> :
        !selection ? <p className="text-xs text-[#A8B6BC]">No selection</p> : (
          <div className="space-y-3">
            {selection.selected ? (
              <div className="p-3 rounded-[6px] bg-[#EAF7F2] border border-[#B9E2C8]">
                <div className="text-xs text-[#1A6B4A] font-semibold">✓ SELECTED — {selection.selected.name}</div>
                <div className="text-xs text-[#285466] mt-1">{selection.reason}</div>
                {selection.bestDetail?.breakdown && (
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
                    <div className="bg-white border border-[#DCE7EC] rounded p-1.5">Travel <b>{selection.bestDetail.breakdown.travel}m</b></div>
                    <div className="bg-white border border-[#DCE7EC] rounded p-1.5">Queue <b>{selection.bestDetail.breakdown.queueTime}m</b></div>
                    <div className="bg-white border border-[#DCE7EC] rounded p-1.5">Bed <b>{selection.bestDetail.breakdown.bedPenalty}</b></div>
                    <div className="bg-white border border-[#DCE7EC] rounded p-1.5">ICU <b>{selection.bestDetail.breakdown.icuPenalty}</b></div>
                    <div className="bg-white border border-[#DCE7EC] rounded p-1.5">Med <b>{selection.bestDetail.breakdown.medicinePenalty}</b></div>
                    <div className="bg-white border border-[#123B5D] rounded p-1.5 font-bold">Total <b>{selection.bestDetail.breakdown.total}</b></div>
                  </div>
                )}
                <div className="mt-2 text-[11px] text-[#58707B]">Route: {selection.bestDetail?.route?.path?.join(' → ') || '—'} · ETA {selection.bestDetail?.travelTime?.toFixed(1)}m</div>
              </div>
            ) : (
              <div className="p-3 rounded bg-[#FDECEE] border border-[#F5C2C7] text-xs text-[#7A1A1A]">
                <div>{selection.reason}</div>
                <div className="mt-2 text-[#8A6A00] bg-[#FFF5E5] border border-[#FFE5B2] rounded px-2 py-1">Tip: Try “Reset” to refresh hospitals, use “★ Demo: Reject Nearest”, or change specialty to “general”.</div>
              </div>
            )}
            <div>
              <h3 className="text-xs font-semibold mb-1 text-[#123B5D]">All Candidates (sorted by total cost)</h3>
              <div className="space-y-1 max-h-56 overflow-auto pr-1">
                {selection.candidates.map(c=> (
                  <div key={c.hospital.id} className={`p-2 rounded text-xs border ${c.feasible?'border-[#DCE7EC] bg-white':'border-[#F5C2C7] bg-[#FDECEE]'}`}>
                    <div className="flex justify-between font-medium">
                      <span className="text-[#123B5D]">{c.hospital.name} <span className="text-[#81949D] font-normal">· {c.hospital.id}</span></span>
                      {c.feasible ? <Badge tone="green">{c.totalCost.toFixed(1)}</Badge> : <Badge tone="red">REJECT</Badge>}
                    </div>
                    <div className={c.feasible?'text-[#285466]':'text-[#7A1A1A]'}>{c.reason}</div>
                    {!c.feasible && <div className="text-[11px] text-[#81949D]">{c.hospital.specialties.join(', ')} · beds {c.hospital.bedsAvailable}/{c.hospital.bedsTotal} · ICU {c.hospital.icuAvailable}</div>}
                  </div>
                ))}
              </div>
            </div>
            {selection.rejected.length>0 && (
              <div>
                <h3 className="text-xs font-semibold mb-1 text-[#7A1A1A]">Rejected — nearest would have been infeasible</h3>
                <div className="space-y-1">
                  {selection.rejected.map(r=> (
                    <div key={r.hospital.id} className="p-1.5 rounded bg-[#FDECEE] border border-[#F5C2C7] text-xs flex justify-between">
                      <span className="text-[#7A1A1A]">{r.hospital.name}</span><span className="text-[#D92D3A]">{r.reason}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#8A6A00] mt-2 bg-[#FFF5E5] border border-[#FFE5B2] rounded px-2 py-1">Nearest ≠ best — system chooses feasible lowest-cost, not shortest distance.</p>
              </div>
            )}
            {transferDecision && (
              <div className="panel p-3 bg-[#F8FBFC]">
                <h3 className="text-xs font-semibold text-[#123B5D]">Transfer vs Medicine Delivery</h3>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className={`p-2 rounded border ${transferDecision.transfer.feasible ? 'bg-white border-[#DCE7EC]' : 'bg-[#FDECEE] border-[#F5C2C7]'}`}>
                    <div className="font-semibold text-[#123B5D]">Transfer</div>
                    <div className={transferDecision.transfer.feasible ? 'text-[#238B68]' : 'text-[#7A1A1A]'}>{transferDecision.transfer.reason}</div>
                    {transferDecision.transfer.feasible && <div className="text-[#81949D]">ETA {transferDecision.transfer.eta.toFixed(1)}m</div>}
                  </div>
                  <div className={`p-2 rounded border ${transferDecision.delivery.feasible ? 'bg-white border-[#DCE7EC]' : 'bg-[#FDECEE] border-[#F5C2C7]'}`}>
                    <div className="font-semibold text-[#123B5D]">Deliver Medicine</div>
                    <div className={transferDecision.delivery.feasible ? 'text-[#238B68]' : 'text-[#7A1A1A]'}>{transferDecision.delivery.reason}</div>
                    {transferDecision.delivery.feasible && <div className="text-[#81949D]">ETA {transferDecision.delivery.eta.toFixed(1)}m</div>}
                  </div>
                </div>
                <div className={`mt-2 px-2 py-1.5 rounded text-xs font-semibold border ${transferDecision.recommendation==='TRANSFER'?'bg-[#EAF7F2] border-[#B9E2C8] text-[#1A6B4A]': transferDecision.recommendation==='DELIVER'?'bg-[#FFF5E5] border-[#FFE5B2] text-[#8A6A00]':'bg-[#FDECEE] border-[#F5C2C7] text-[#7A1A1A]'}`}>
                  Recommendation: {transferDecision.recommendation} — {transferDecision.reason}
                </div>
              </div>
            )}
          </div>
        )
      }
    </div>
  )
}
