export function MetricsPanel({ metrics, cache }) {
  if (!metrics) return null
  const items = [
    { label: 'Avg Wait', value: `${metrics.avgWait} min` },
    { label: 'Critical Wait', value: `${metrics.avgCritWait} min` },
    { label: 'Hospital Util', value: `${metrics.hospUtil}%` },
    { label: 'ICU Util', value: `${metrics.icuUtil}%` },
    { label: 'Ambulance Util', value: `${metrics.ambUtil}%` },
    { label: 'Routing', value: `${metrics.routingMs}ms` },
    { label: 'Cache Hits', value: `${cache?.hits || 0}` },
  ]
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-3">Live Metrics <span className="text-[10px] font-normal text-[#81949D] ml-1">measured via performance.now()</span></h2>
      <div className="grid grid-cols-3 gap-2">
        {items.map(it => (
          <div key={it.label} className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2 text-center">
            <div className="text-[11px] text-[#81949D]">{it.label}</div>
            <div className="font-mono font-bold text-[13px] text-[#123B5D]">{it.value}</div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#81949D] mt-2">Waiting = now − createdAt (minutes since creation). Routing = Dijkstra + A* measured.</p>
    </div>
  )
}

export function BenchmarkPanel({ benchmark }) {
  if (!benchmark) return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D]">Benchmark</h2>
      <p className="text-xs text-[#A8B6BC] mt-2">Create at least one emergency to compare baseline vs smart</p>
      <p className="text-[10px] text-[#81949D] mt-2">Baselines use nearest-hospital without hard-constraint checks — failures count when specialist/bed/medicine missing.</p>
    </div>
  )
  const improving = parseFloat(benchmark.improvement) > 0
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-2">Benchmark <span className="text-[11px] font-normal text-[#81949D]">baseline nearest vs smart feasibility+cost</span></h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#FFF5E5] border border-[#FFE2B0] rounded p-2">
          <div className="font-semibold text-[#8A5A00]">Baseline <span className="font-normal text-[10px]">nearest ignores constraints</span></div>
          <div>Avg response: <b className="font-mono">{benchmark.baseline.avgEta === '—' ? '—' : `${benchmark.baseline.avgEta}m`}</b> <span className="text-[#81949D]">({benchmark.baseline.avgQueue === '—' ? '—' : `${benchmark.baseline.avgQueue}m`} queue)</span></div>
          <div>Failed: {benchmark.baseline.failed} <span className="text-[#81949D]">({benchmark.baseline.failedPct}%)</span></div>
          <div className="text-[10px] text-[#81949D]">Route {benchmark.baseline.routingMs}ms/q</div>
        </div>
        <div className="bg-[#EAF7F2] border border-[#B9E2C8] rounded p-2">
          <div className="font-semibold text-[#1A6B4A]">Smart <span className="font-normal text-[10px]">feasible + totalCost</span></div>
          <div>Avg response: <b className="font-mono">{benchmark.smart.avgEta === '—' ? '—' : `${benchmark.smart.avgEta}m`}</b> <span className="text-[#81949D]">({benchmark.smart.avgQueue === '—' ? '—' : `${benchmark.smart.avgQueue}m`} queue)</span></div>
          <div>Failed: {benchmark.smart.failed} <span className="text-[#81949D]">({benchmark.smart.failedPct}%)</span></div>
          <div className="text-[10px] text-[#81949D]">Route {benchmark.smart.routingMs}ms/q</div>
        </div>
      </div>
      <div className={`mt-2 text-xs font-semibold px-2 py-1 rounded ${improving ? 'bg-[#EAF7F2] text-[#1A6B4A] border border-[#B9E2C8]' : 'bg-[#FFF5E5] text-[#8A5A00] border border-[#FFE2B0]'}`}>
        {benchmark.improvement} — {benchmark.improvementNote}
      </div>
      <div className="mt-1 text-[10px] text-[#81949D]">Avg routing {benchmark.avgRoutingMs}ms/query. {benchmark.note}</div>
    </div>
  )
}
