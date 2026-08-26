/**
 * Medicine stock management — Phase 5.3 & 5.4
 * PRD 7.10 / 7.12
 */

export function getMedicineStatus(quantity, thresholds) {
  const q = Number(quantity)
  if (!isFinite(q) || q <= 0) return 'OUT_OF_STOCK'
  const min = thresholds?.minimum ?? 15
  const crit = thresholds?.critical ?? 5
  if (q <= crit) return 'CRITICAL'
  if (q <= min) return 'LOW'
  return 'NORMAL'
}

export function predictStockoutHours(currentStock, consumptionRate) {
  const stock = Number(currentStock)
  const rate = Number(consumptionRate)
  if (!isFinite(stock) || stock <= 0) return 0
  if (!isFinite(rate) || rate <= 0) return Infinity
  return stock / rate
}

export function formatStockout(hours) {
  if (hours === Infinity) return 'No consumption'
  if (hours === 0) return 'Out of stock'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours.toFixed(1)} h`
  const days = hours / 24
  if (days < 7) return `${days.toFixed(1)} d`
  return `${hours.toFixed(0)} h`
}

export function getMedicineWarnings(stock, rate, thresholds) {
  const status = getMedicineStatus(stock, thresholds)
  const hours = predictStockoutHours(stock, rate)
  const warnings = []
  if (status === 'OUT_OF_STOCK') warnings.push('OUT OF STOCK — immediate restock required')
  else if (status === 'CRITICAL') warnings.push(`CRITICAL — stockout in ${formatStockout(hours)}`)
  else if (status === 'LOW') warnings.push(`LOW — stockout in ${formatStockout(hours)}`)
  else if (hours !== Infinity && hours <= 24) warnings.push(`Predicted LOW in ${formatStockout(hours)}`)
  return { status, hours, warnings }
}
