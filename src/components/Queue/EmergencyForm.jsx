import { Badge } from '../common/Badge.jsx'

export function EmergencyForm({ form, setForm, villageNodes, onCreate, onDemo, demoMode, crossRegion, setCrossRegion }) {
  const SPECIALTIES = ['cardiology', 'neurology', 'trauma', 'general', 'pediatrics', 'orthopedics']
  const EQUIP = ['ventilator', 'oxygen', 'xray', 'icu', 'defibrillator', 'stretcher']
  const MEDS = ['epinephrine', 'insulin', 'saline', 'morphine', 'antibiotic']
  const URGENCIES = ['Critical', 'High', 'Medium', 'Low']

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm mb-3 flex items-center justify-between">Create Emergency <Badge tone={form.urgency==='Critical'?'red': form.urgency==='High'?'orange':'yellow'}>{form.urgency}</Badge></h2>
      <div className="space-y-3 text-sm">
        <label className="block">Village / Origin
          <select value={form.originNode} onChange={e=>setForm({...form, originNode:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5">
            {villageNodes.map(n=> <option key={n.id} value={n.id}>{n.name} ({n.id})</option>)}
          </select>
        </label>
        <label className="block">Urgency
          <select value={form.urgency} onChange={e=>setForm({...form, urgency:e.target.value})} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5">
            {URGENCIES.map(u=> <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <div>
          <div className="text-xs text-slate-400 mb-1">Required Specialties</div>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTIES.map(s=> {
              const on = form.requiredSpecialties.includes(s)
              return <button key={s} onClick={()=> setForm(f=> ({...f, requiredSpecialties: on? f.requiredSpecialties.filter(x=>x!==s) : [...f.requiredSpecialties, s]}))} className={`px-2 py-1 rounded-full text-xs border ${on?'bg-sky-900/60 border-sky-700 text-sky-200':'bg-slate-800 border-slate-700 text-slate-400'}`}>{s}</button>
            })}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Required Equipment</div>
          <div className="flex flex-wrap gap-1.5">
            {EQUIP.map(s=> {
              const on = form.requiredEquipment.includes(s)
              return <button key={s} onClick={()=> setForm(f=> ({...f, requiredEquipment: on? f.requiredEquipment.filter(x=>x!==s) : [...f.requiredEquipment, s]}))} className={`px-2 py-1 rounded-full text-xs border ${on?'bg-emerald-900/60 border-emerald-700 text-emerald-200':'bg-slate-800 border-slate-700 text-slate-400'}`}>{s}</button>
            })}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Required Medicines</div>
          <div className="flex flex-wrap gap-1.5">
            {MEDS.map(s=> {
              const on = form.requiredMedicines.includes(s)
              return <button key={s} onClick={()=> setForm(f=> ({...f, requiredMedicines: on? f.requiredMedicines.filter(x=>x!==s) : [...f.requiredMedicines, s]}))} className={`px-2 py-1 rounded-full text-xs border ${on?'bg-amber-900/60 border-amber-700 text-amber-200':'bg-slate-800 border-slate-700 text-slate-400'}`}>{s}</button>
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={form.requiresICU} onChange={e=>setForm({...form, requiresICU:e.target.checked})} /> Requires ICU
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={crossRegion} onChange={e=>setCrossRegion(e.target.checked)} /> Cross-region ambulance fallback
        </label>
        <button onClick={onCreate} className="w-full py-2 bg-sky-600 hover:bg-sky-500 rounded font-semibold text-sm">+ Add Emergency & Dispatch</button>
        <button onClick={onDemo} className="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded font-semibold text-xs">★ Demo: Reject Nearest</button>
        {demoMode && <p className="text-xs text-amber-300">Demo hospitals injected: H01 lacks cardiology, H02 ICU full — farthest feasible should win.</p>}
      </div>
    </div>
  )
}
