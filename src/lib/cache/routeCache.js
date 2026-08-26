const cache = new Map()
const MAX = 200
let hits = 0, misses = 0

function key(a, b, mode) { return `${a}->${b}:${mode}` }

export function getCached(a, b, mode) {
  const k = key(a, b, mode)
  if (cache.has(k)) { hits++; const v = cache.get(k); cache.delete(k); cache.set(k, v); return v }
  misses++
  return null
}

export function setCached(a, b, mode, value) {
  const k = key(a, b, mode)
  if (cache.size >= MAX) cache.delete(cache.keys().next().value)
  cache.set(k, value)
}

export function invalidate() { cache.clear() }

export function stats() { return { size: cache.size, hits, misses } }
