export function AmbulancePanel({ selectedReq, ambSelection }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm mb-2">Ambulance Dispatch</h2>
      {!selectedReq ? <p className="text-xs text-slate-500">Select a request</p> :
        !ambSelection ? <p className="text-xs text-slate-500">No selection</p> : (
          <div className="space-y-2 text-xs">
            <p className={`${ambSelection.selected?'text-green-300':'text-red-300'}`}>{ambSelection.reason}</p>
            <div className="max-h-36 overflow-auto space-y-1">
              {ambSelection.candidates.map(c=> (
                <div key={c.amb.id} className={`flex justify-between px-2 py-1 rounded ${c.feasible?'bg-slate-800':'bg-red-950/30 border border-red-900/40'}`}>
                  <span>{c.amb.id} <span className="text-slate-400">({c.amb.location})</span></span>
                  <span className={c.feasible?'text-green-300':'text-red-300'}>{c.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  )
}
