import { Icon, ICONS } from '../common/Icon.jsx'

export function NavRail({ active, onChange }) {
  const items = [
    { id: 'mission', label: 'Mission', d: ICONS.mission },
    { id: 'dispatch', label: 'Dispatch', d: ICONS.dispatch },
    { id: 'facilities', label: 'Facilities', d: ICONS.facilities },
    { id: 'resources', label: 'Resources', d: ICONS.resources },
    { id: 'analytics', label: 'Analytics', d: ICONS.analytics },
    { id: 'decisions', label: 'Decisions', d: ICONS.decisions },
    { id: 'simulation', label: 'Simulation', d: ICONS.simulation },
  ]
  return (
    <nav className="w-[68px] shrink-0 bg-white border-r border-[#DCE7EC] flex flex-col items-center py-3 gap-1 sticky top-[60px] h-[calc(100vh-60px)] overflow-auto">
      {items.map(it => {
        const on = active === it.id
        return (
          <button key={it.id} onClick={() => onChange(it.id)} title={it.label}
            className={`w-[52px] flex flex-col items-center gap-1 py-2 rounded-[6px] border-l-2 transition-colors ${on ? 'bg-[#EAF7FC] text-[#1677A8] border-[#218FC2]' : 'text-[#6E858F] border-transparent hover:bg-[#F1F7F9] hover:text-[#285466]'}`}>
            <span className={on ? 'text-[#1677A8]' : 'text-[#58707B]'}><Icon d={it.d} size={18} /></span>
            <span className="text-[9px] font-semibold tracking-wide leading-none">{it.label.toUpperCase()}</span>
          </button>
        )
      })}
      <div className="mt-auto pt-4 flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#EAF7FC] border border-[#DCE7EC] flex items-center justify-center text-[11px] font-bold text-[#1677A8]">OP</div>
        <span className="text-[9px] font-semibold text-[#81949D]">OPERATOR</span>
      </div>
    </nav>
  )
}
