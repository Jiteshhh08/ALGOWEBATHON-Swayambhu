export function Badge({ children, tone = 'slate' }) {
  const map = {
    slate: 'bg-slate-800 text-slate-200 border-slate-700',
    red: 'bg-red-950/60 text-red-300 border-red-800',
    orange: 'bg-orange-950/60 text-orange-300 border-orange-800',
    yellow: 'bg-yellow-950/60 text-yellow-300 border-yellow-800',
    green: 'bg-green-950/60 text-green-300 border-green-800',
    blue: 'bg-blue-950/60 text-blue-300 border-blue-800',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[tone]}`}>{children}</span>
}
