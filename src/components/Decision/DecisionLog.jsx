export function DecisionLog({ decisions }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm mb-2">Decision Log <span className="text-xs font-normal text-slate-500">({decisions.length})</span></h2>
      {decisions.length===0 ? <p className="text-xs text-slate-500">No decisions yet — create an emergency</p> :
        <div className="space-y-1.5 max-h-[220px] overflow-auto pr-1 text-xs">
          {decisions.map(d=> (
            <div key={d.id} className="p-2 rounded border border-slate-700 bg-slate-800">
              <div className="flex justify-between"><span className="font-mono font-bold">{d.id}</span><span className="text-slate-400">{new Date(d.timestamp).toLocaleTimeString()}</span></div>
              <div className="font-medium">{d.decisionType} · {d.requestId} · <span className="text-sky-300">{d.algorithm}</span></div>
              <div className="text-slate-300">{d.reason}</div>
              {d.alternatives?.length>0 && <div className="text-[11px] text-slate-500">Alternatives: {d.alternatives.map(a=>`${a.id || a.name} (${a.reason})`).join(' | ')}</div>}
              {d.selected && <div className="text-green-300">→ Selected: {d.selected.id || d.selected.name}</div>}
            </div>
          ))}
        </div>
      }
    </div>
  )
}

export function EventLog({ logs }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm mb-2">Event Log</h2>
      {logs.length===0 ? <p className="text-xs text-slate-500">No events yet</p> :
        <div className="space-y-1.5 max-h-[280px] overflow-auto pr-1 font-mono text-xs">
          {logs.map((l,i)=> (
            <div key={i} className={`px-2 py-1 rounded border ${l.tone==='green'?'border-green-800 bg-green-950/20 text-green-200': l.tone==='red'?'border-red-800 bg-red-950/20 text-red-200': l.tone==='yellow'?'border-amber-800 bg-amber-950/20 text-amber-200': 'border-slate-700 bg-slate-800 text-slate-300'}`}>
              <span className="text-slate-500">{l.ts}</span> <b>{l.type}</b> — {l.msg}
            </div>
          ))}
        </div>
      }
    </div>
  )
}
