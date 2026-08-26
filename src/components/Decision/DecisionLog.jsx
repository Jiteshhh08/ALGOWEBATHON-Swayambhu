export function DecisionLog({ decisions }) {
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-2">Decision Log <span className="text-xs font-normal text-[#81949D]">({decisions.length})</span></h2>
      {decisions.length===0 ? <p className="text-xs text-[#A8B6BC]">No decisions yet — create an emergency</p> :
        <div className="space-y-1.5 max-h-[220px] overflow-auto pr-1 text-xs">
          {decisions.map(d=> (
            <div key={d.id} className="p-2 rounded border border-[#DCE7EC] bg-[#F8FBFC]">
              <div className="flex justify-between"><span className="font-mono font-bold text-[#123B5D]">{d.id}</span><span className="text-[#81949D]">{new Date(d.timestamp).toLocaleTimeString()}</span></div>
              <div className="font-medium text-[#123B5D]">{d.decisionType} · {d.requestId} · <span className="text-[#1677A8]">{d.algorithm}</span></div>
              <div className="text-[#285466]">{d.reason}</div>
              {d.alternatives?.length>0 && <div className="text-[11px] text-[#81949D]">Alternatives: {d.alternatives.map(a=>`${a.id || a.name} (${a.reason})`).join(' | ')}</div>}
              {d.selected && <div className="text-[#238B68] font-medium">→ Selected: {d.selected.id || d.selected.name}</div>}
            </div>
          ))}
        </div>
      }
    </div>
  )
}

export function EventLog({ logs }) {
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-2">Event Log</h2>
      {logs.length===0 ? <p className="text-xs text-[#A8B6BC]">No events yet</p> :
        <div className="space-y-1.5 max-h-[280px] overflow-auto pr-1 font-mono text-xs">
          {logs.map((l,i)=> (
            <div key={i} className={`px-2 py-1.5 rounded border ${l.tone==='green'?'border-[#B9E2C8] bg-[#EAF7F2] text-[#1A6B4A]': l.tone==='red'?'border-[#F5C2C7] bg-[#FDECEE] text-[#7A1A1A]': l.tone==='yellow'?'border-[#FFE5B2] bg-[#FFF5E5] text-[#5A3A0A]': 'border-[#DCE7EC] bg-[#F8FBFC] text-[#285466]'}`}>
              <span className="text-[#81949D]">{l.ts}</span> <b className="text-[#123B5D]">{l.type}</b> — {l.msg}
            </div>
          ))}
        </div>
      }
    </div>
  )
}
