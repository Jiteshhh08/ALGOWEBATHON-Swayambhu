let seq = 0

export function createEventLog(limit = 100) {
  const events = []

  function push(type, requestId, detail) {
    const e = {
      id: `EVT-${String(++seq).padStart(4, '0')}`,
      timestamp: Date.now(),
      type,
      requestId,
      detail,
    }
    events.unshift(e)
    if (events.length > limit) events.pop()
    return e
  }

  return {
    push,
    getAll: () => [...events],
    clear: () => { events.length = 0 },
    get count() { return events.length },
  }
}
