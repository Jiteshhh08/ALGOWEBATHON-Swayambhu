export function AmbulancePanel({ selectedReq, ambSelection }) {
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-2">Ambulance Dispatch</h2>
      {!selectedReq ? <p className="text-xs text-[#A8B6BC]">Select a request</p> :
        !ambSelection ? <p className="text-xs text-[#A8B6BC]">No selection</p> : (
          <div className="space-y-2 text-xs">
            <p className={`${ambSelection.selected?'text-[#238B68]':'text-[#D92D3A]'} font-medium`}>{ambSelection.reason}</p>
            <div className="max-h-36 overflow-auto space-y-1">
              {ambSelection.candidates.map(c=> (
                <div key={c.amb.id} className={`flex justify-between px-2 py-1.5 rounded border text-xs ${c.feasible?'bg-white border-[#DCE7EC] text-[#16313F]':'bg-[#FDECEE] border-[#F5C2C7] text-[#7A1A1A]'}`}>
                  <span className="font-medium">{c.amb.id} <span className="text-[#81949D] font-normal">({c.amb.location})</span></span>
                  <span className={c.feasible?'text-[#238B68]':'text-[#D92D3A]'}>{c.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  )
}
