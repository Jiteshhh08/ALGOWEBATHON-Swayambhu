let counter = 0

export function createRecord({ requestId, decisionType, selected, alternatives = [], reason, algorithm }) {
  return {
    id: `DEC-${String(++counter).padStart(4, '0')}`,
    timestamp: Date.now(),
    requestId,
    decisionType,
    selected,
    alternatives,
    reason,
    algorithm,
  }
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString()
}
