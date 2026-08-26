import { Icon, ICONS } from '../common/Icon.jsx'

export function Header({ graph, hospitals, ambulances, onReset, simOpen, setSimOpen, onBell, notifCount }) {
  const ambAvailable = ambulances.filter(a => a.status === 'AVAILABLE').length
  return (
    <header className="h-[60px] shrink-0 bg-white border-b border-[#DCE7EC] sticky top-0 z-20">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="leading-tight">
            <div className="text-[13px] font-bold tracking-[0.12em] text-[#123B5D]">HEALTHCARE NETWORK</div>
            <div className="text-[11px] font-medium tracking-[0.08em] text-[#81949D]">COMMAND CENTER</div>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-6 pl-6 border-l border-[#DCE7EC]">
            <div className="h-[36px] w-[160px] bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] flex items-center px-3 gap-2 overflow-hidden relative">
              <span className="w-2 h-2 rounded-full bg-[#238B68] shrink-0" />
              <span className="text-[11px] font-semibold tracking-wide text-[#16313F]">LIVE NETWORK</span>
              <span className="ml-auto text-[11px] font-medium text-[#238B68] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#238B68] inline-block" /> Operational</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-3 mr-2">
            <span className="text-[11px] font-medium text-[#58707B]">{graph.nodeCount} nodes · {graph.edgeCount} edges</span>
            <span className="w-px h-4 bg-[#DCE7EC]" />
            <span className="text-[11px] font-medium text-[#58707B]">{hospitals.length} hospitals · {ambAvailable} ambulances</span>
          </div>
          <button onClick={() => setSimOpen(v => !v)} className={`hidden sm:inline-flex items-center gap-1.5 px-3 h-9 rounded-[5px] text-[13px] font-semibold border ${simOpen ? 'bg-[#123B5D] text-white border-[#123B5D]' : 'bg-white text-[#285466] border-[#C7D7DE] hover:bg-[#F8FBFC]'}`}>Simulation</button>
          <button onClick={onBell} className="relative w-9 h-9 rounded-[5px] border border-[#DCE7EC] bg-white flex items-center justify-center text-[#58707B] hover:bg-[#F8FBFC]">
            <Icon d={ICONS.bell} size={16} />
            {notifCount > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-[#D92D3A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>}
          </button>
          <div className="w-9 h-9 rounded-full bg-[#EAF7FC] border border-[#DCE7EC] flex items-center justify-center text-xs font-bold text-[#1677A8]">JD</div>
          <button onClick={onReset} className="hidden sm:inline-flex h-9 px-3 items-center rounded-[5px] bg-[#1677A8] hover:bg-[#155A83] text-white text-[13px] font-semibold">Reset</button>
        </div>
      </div>
    </header>
  )
}
