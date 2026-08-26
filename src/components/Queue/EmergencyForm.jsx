import { Badge } from '../common/Badge.jsx'

export function EmergencyForm({ form, setForm, villageNodes, onCreate, onDemo, demoMode, crossRegion, setCrossRegion }) {
  const SPECIALTIES = ['cardiology', 'neurology', 'trauma', 'general', 'pediatrics', 'orthopedics']
  const EQUIP = ['ventilator', 'oxygen', 'xray', 'icu', 'defibrillator', 'stretcher']
  const MEDS = ['epinephrine', 'insulin', 'saline', 'morphine', 'antibiotic']
  const URGENCIES = ['Critical', 'High', 'Medium', 'Low']

  const pillOn = 'bg-[#EAF7FC] border-[#218FC2] text-[#123B5D]'
  const pillOff = 'bg-white border-[#DCE7EC] text-[#58707B] hover:bg-[#F8FBFC]'

  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-3 flex items-center justify-between">Create Emergency <Badge tone={form.urgency==='Critical'?'red': form.urgency==='High'?'orange':'yellow'}>{form.urgency}</Badge></h2>
      <div className="space-y-3 text-sm">
        <label className="block text-[12px] font-medium text-[#285466]">Village / Origin
          <select value={form.originNode} onChange={e=>setForm({...form, originNode:e.target.value})} className="mt-1 w-full bg-white border border-[#C7D7DE] rounded-[5px] px-2 py-1.5 text-[#16313F]">
            {villageNodes.map(n=> <option key={n.id} value={n.id}>{n.name} ({n.id})</option>)}
          </select>
        </label>
        <label className="block text-[12px] font-medium text-[#285466]">Urgency
          <select value={form.urgency} onChange={e=>setForm({...form, urgency:e.target.value})} className="mt-1 w-full bg-white border border-[#C7D7DE] rounded-[5px] px-2 py-1.5 text-[#16313F]">
            {URGENCIES.map(u=> <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <div>
          <div className="text-[11px] font-semibold text-[#58707B] mb-1">Required Specialties</div>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTIES.map(s=> {
              const on = form.requiredSpecialties.includes(s)
              return <button key={s} onClick={()=> setForm(f=> ({...f, requiredSpecialties: on? f.requiredSpecialties.filter(x=>x!==s) : [...f.requiredSpecialties, s]}))} className={`px-2 py-1 rounded-full text-xs border font-medium ${on? pillOn : pillOff}`}>{s}</button>
            })}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-[#58707B] mb-1">Required Equipment</div>
          <div className="flex flex-wrap gap-1.5">
            {EQUIP.map(s=> {
              const on = form.requiredEquipment.includes(s)
              return <button key={s} onClick={()=> setForm(f=> ({...f, requiredEquipment: on? f.requiredEquipment.filter(x=>x!==s) : [...f.requiredEquipment, s]}))} className={`px-2 py-1 rounded-full text-xs border font-medium ${on?'bg-[#EAF7F2] border-[#238B68] text-[#123B5D]': pillOff}`}>{s}</button>
            })}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-[#58707B] mb-1">Required Medicines</div>
          <div className="flex flex-wrap gap-1.5">
            {MEDS.map(s=> {
              const on = form.requiredMedicines.includes(s)
              return <button key={s} onClick={()=> setForm(f=> ({...f, requiredMedicines: on? f.requiredMedicines.filter(x=>x!==s) : [...f.requiredMedicines, s]}))} className={`px-2 py-1 rounded-full text-xs border font-medium ${on?'bg-[#FFF5E5] border-[#D88A16] text-[#5A3A0A]': pillOff}`}>{s}</button>
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#285466]">
          <input type="checkbox" checked={form.requiresICU} onChange={e=>setForm({...form, requiresICU:e.target.checked})} className="accent-[#1677A8]" /> Requires ICU
        </label>
        <label className="flex items-center gap-2 text-xs text-[#285466]">
          <input type="checkbox" checked={crossRegion} onChange={e=>setCrossRegion(e.target.checked)} className="accent-[#1677A8]" /> Cross-region ambulance fallback
        </label>
        <button onClick={onCreate} className="w-full py-2 bg-[#1677A8] hover:bg-[#155A83] rounded-[5px] font-semibold text-sm text-white">+ Add Emergency & Dispatch</button>
        <button onClick={onDemo} className="w-full py-2 bg-white border border-[#C7D7DE] hover:bg-[#F8FBFC] rounded-[5px] font-semibold text-xs text-[#285466]">★ Demo: Reject Nearest</button>
        {demoMode && <p className="text-xs text-[#8A6A00] bg-[#FFF5E5] border border-[#FFE5B2] rounded px-2 py-1.5">Demo hospitals injected: H01 lacks cardiology, H02 ICU full — farthest feasible should win.</p>}
      </div>
    </div>
  )
}
