export function SimulationBar({ onAddRandom, onCloseRoad, onReset }) {
  return (
    <div className="panel p-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[#123B5D]">Simulation</span>
      <button onClick={onAddRandom} className="px-3 py-1.5 bg-[#1677A8] text-white rounded-[5px] text-xs font-semibold hover:bg-[#155A83]">+ Random Emergency</button>
      <button onClick={onCloseRoad} className="px-3 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-xs font-semibold text-[#285466] hover:bg-[#F8FBFC]">Close Random Road</button>
      <button onClick={onReset} className="px-3 py-1.5 bg-white border border-[#C7D7DE] rounded-[5px] text-xs text-[#58707B]">Reset</button>
    </div>
  )
}
