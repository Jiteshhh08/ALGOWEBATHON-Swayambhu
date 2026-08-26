export function Scenarios({ onA, onB, onC, onD, onE, onF }) {
  const items = [
    { label: 'A: Normal Emergency', on: onA, desc: 'Critical cardiac → dispatch' },
    { label: 'B: Road Closure', on: onB, desc: 'Close road on active route' },
    { label: 'C: Specialist Missing', on: onC, desc: 'Nearest lacks specialist' },
    { label: 'D: Hospital Full', on: onD, desc: 'Fill nearest hospital' },
    { label: 'E: Medicine Shortage', on: onE, desc: 'Remove critical med' },
    { label: 'F: Fleet Shortage', on: onF, desc: 'Mark ambulances busy' },
  ]
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-2">Judge Scenarios <span className="text-[11px] font-normal text-[#81949D]">A–F</span></h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map(it => (
          <button key={it.label} onClick={it.on} className="text-left p-2 rounded border border-[#DCE7EC] bg-white hover:bg-[#F8FBFC] hover:border-[#218FC2]">
            <div className="text-xs font-semibold text-[#123B5D]">{it.label}</div>
            <div className="text-[11px] text-[#81949D]">{it.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
