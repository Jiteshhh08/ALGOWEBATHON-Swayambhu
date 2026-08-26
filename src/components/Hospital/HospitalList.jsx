import { Badge } from '../common/Badge.jsx'

export function HospitalList({ hospitals, selection, onToggle }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm mb-2">Hospitals Inventory</h2>
      <div className="max-h-[320px] overflow-auto space-y-2 pr-1">
        {hospitals.map(h=> {
          const isSelected = selection?.selected?.id===h.id
          return (
            <div key={h.id} className={`p-2.5 rounded border text-xs ${isSelected?'border-green-600 bg-green-950/20':'border-slate-800 bg-slate-800/50'}`}>
              <div className="flex justify-between items-start">
                <div><span className="font-semibold">{h.name}</span> <span className="text-slate-400">· {h.id} · {h.nodeId}</span> {isSelected && <Badge tone="green">SELECTED</Badge>}</div>
                <Badge tone={h.operatingStatus==='OPEN'?'green':'red'}>{h.operatingStatus}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {h.specialties.map(s=> <span key={s} className="px-1.5 py-0.5 bg-slate-700 rounded text-[11px]">{s}</span>)}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                <span>Beds {h.bedsAvailable}/{h.bedsTotal} {h.bedsAvailable/h.bedsTotal<0.3 && '⚠'}</span>
                <span>ICU {h.icuAvailable}/{h.icuTotal}</span>
                <span>Queue {h.queueLength} · {h.queueLength*4}m</span>
                <span>Equip: {h.equipment.slice(0,3).join(', ')}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(h.medicineStock).slice(0,4).map(([k,v])=> {
                  const th=h.medicineThresholds[k]; const tone=v<=th.critical?'red':v<=th.minimum?'yellow':'slate'
                  return <Badge key={k} tone={tone}>{k}:{v}</Badge>
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button onClick={()=>onToggle(h.id,{operatingStatus: h.operatingStatus==='OPEN'?'CLOSED':'OPEN'})} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px]">{h.operatingStatus==='OPEN'?'Close':'Open'} facility</button>
                <button onClick={()=>onToggle(h.id,{bedsAvailable: Math.max(0, h.bedsAvailable-5)})} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px]">-5 beds</button>
                <button onClick={()=>onToggle(h.id,{bedsAvailable: Math.min(h.bedsTotal, h.bedsAvailable+5)})} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px]">+5 beds</button>
                <button onClick={()=>onToggle(h.id,{icuAvailable:0})} className="px-2 py-1 bg-red-900/40 hover:bg-red-800/60 rounded text-[11px] border border-red-800">Fill ICU</button>
                <button onClick={()=>onToggle(h.id,{medicineStock:{...h.medicineStock, epinephrine:0}})} className="px-2 py-1 bg-amber-900/30 hover:bg-amber-800/40 rounded text-[11px]">Stockout epi</button>
                <button onClick={()=>onToggle(h.id,{queueLength: h.queueLength+3})} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[11px]">+3 queue</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
