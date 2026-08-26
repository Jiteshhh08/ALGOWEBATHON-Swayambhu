const URGENCY_WEIGHT = {
  Critical: 100,
  High: 75,
  Medium: 50,
  Low: 25,
}

const DEFAULT_WEIGHTS = {
  urgency: 1,
  waitingPerMin: 1.5,
  escalationPerMin: 0.5,
  maxStarvationBoost: 30,
}

export class EmergencyQueue {
  constructor(weights = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights }
    this.heap = []
    this.map = new Map()
  }

  score(req, now = Date.now()) {
    const waitingMin = Math.max(0, (now - req.createdAt) / 60000)
    const urgencyScore = (URGENCY_WEIGHT[req.urgency] || 25) * this.weights.urgency
    let waitingScore = waitingMin * this.weights.waitingPerMin

    if (req.urgency === 'Low' || req.urgency === 'Medium') {
      waitingScore = Math.min(waitingScore, this.weights.maxStarvationBoost + waitingMin * 0.3)
    }

    let escalation = 0
    if (req.urgency === 'Critical' && waitingMin > 10) {
      escalation = (waitingMin - 10) * this.weights.escalationPerMin
    }

    const risk = req.patientRiskWeight || 0
    const service = req.serviceRequirementWeight || 0
    return urgencyScore + waitingScore + escalation + risk + service
  }

  insert(req) {
    if (!req.id) throw new Error('Request needs id')
    if (!req.createdAt) req.createdAt = Date.now()
    this.map.set(req.id, req)
    this._rebuild()
  }

  peek(now) {
    if (this.heap.length === 0) return null
    this._rebuild(now)
    return this.heap[0] || null
  }

  pop(now) {
    this._rebuild(now)
    const top = this.heap.shift()
    if (top) this.map.delete(top.id)
    return top || null
  }

  remove(id) {
    this.map.delete(id)
    this._rebuild()
  }

  update(id, patch) {
    const req = this.map.get(id)
    if (!req) return null
    Object.assign(req, patch)
    this._rebuild()
    return req
  }

  _rebuild(now = Date.now()) {
    const arr = [...this.map.values()]
    arr.sort((a, b) => this.score(b, now) - this.score(a, now))
    this.heap = arr
  }

  reprioritize(now) {
    this._rebuild(now)
  }

  get size() {
    return this.map.size
  }

  toSorted(now) {
    this._rebuild(now)
    return [...this.heap]
  }

  getStarvationRisk(now = Date.now()) {
    const sorted = this.toSorted(now)
    const low = sorted.filter((r) => r.urgency === 'Low')
    if (low.length === 0) return null
    const oldest = low.reduce((a, b) => (a.createdAt < b.createdAt ? a : b))
    const wait = (now - oldest.createdAt) / 60000
    return { id: oldest.id, waitingMin: wait, score: this.score(oldest, now) }
  }
}
