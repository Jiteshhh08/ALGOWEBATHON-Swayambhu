export function MetricsPanel({ metrics, cache }) {
  if (!metrics) return null
  const items = [
    { label: 'Avg Wait', value: `${metrics.avgWait}m` },
    { label: 'Critical Wait', value: `${metrics.avgCritWait}m` },
    { label: 'Hospital Util', value: `${metrics.hospUtil}%` },
    { label: 'ICU Util', value: `${metrics.icuUtil}%` },
    { label: 'Ambulance Util', value: `${metrics.ambUtil}%` },
    { label: 'Routing', value: `${metrics.routingMs}ms` },
    { label: 'Cache Hits', value: `${cache?.hits || 0}` },
  ]
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-3">Live Metrics</h2>
      <div className="grid grid-cols-3 gap-2">
        {items.map(it => (
          <div key={it.label} className="bg-[#F8FBFC] border border-[#DCE7EC] rounded-[6px] p-2 text-center">
            <div className="text-[11px] text-[#81949D]">{it.label}</div>
            <div className="font-mono font-bold text-[13px] text-[#123B5D]">{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BenchmarkPanel({ benchmark }) {
  if (!benchmark) return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D]">Benchmark</h2>
      <p className="text-xs text-[#A8B6BC] mt-2">Create at least one emergency to compare baseline vs smart</p>
    </div>
  )
  return (
    <div className="panel p-4">
      <h2 className="font-semibold text-[13px] tracking-wide text-[#123B5D] mb-2">Benchmark <span className="text-[11px] font-normal text-[#81949D]">baseline nearest vs smart</span></h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#F8FBFC] border border-[#DCE7EC] rounded p-2">
          <div className="font-semibold text-[#58707B]">Baseline</div>
          <div>Avg ETA: <b className="font-mono">{benchmark.baseline.avgEta}m</b></div>
          <div>Failed: {benchmark.baseline.failed}</div>
        </div>
        <div className="bg-[#EAF7F2] border border-[#B9E2C8] rounded p-2">
          <div className="font-semibold text-[#1A6B4A]">Smart</div>
          <div>Avg ETA: <b className="font-mono">{benchmark.smart.avgEta}m</b></div>
          <div>Failed: {benchmark.smart.failed}</div>
          <div>Queue: {benchmark.smart.avgQueue}m</div>
        </div>
      </div>
      <div className="mt-2 text-xs font-semibold text-[#1677A8]">{benchmark.improvement} — {benchmark.note}</div>
    </div>
  )
}
