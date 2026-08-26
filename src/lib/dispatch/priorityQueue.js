/**
 * Emergency Priority Queue — JS
 * Score = urgencyWeight + waitingTimeWeight + escalation
 * Prevents starvation: waitingTime gradually boosts Low/Medium
 *
 * Request: { id, urgency: 'Critical'|'High'|'Medium'|'Low', createdAt, requiredSpecialties?, requiredEquipment?, ... }
 */

/** @type {Record<string, number>} */
const URGENCY_WEIGHT = {
  Critical: 100,
  High: 75,
  Medium: 50,
  Low: 25,
}

const DEFAULT_WEIGHTS = {
  urgency: 1,
  waitingPerMin: 1.5, // each minute waiting adds 1.5
  escalationPerMin: 0.5, // extra for Critical after 10m
  maxStarvationBoost: 30, // cap to avoid Low overtaking Critical too fast
}

export class EmergencyQueue {
  /**
   * @param {{ urgency?: number, waitingPerMin?: number, escalationPerMin?: number, maxStarvationBoost?: number }} [weights]
   */
  constructor(weights = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights }
    /** @type {Array<any>} */
    this.heap = [] // max-heap by score (higher first)
    /** @type {Map<string, any>} */
    this.map = new Map() // id -> request
  }

  /**
   * Compute priority score
   * @param {any} req
   * @param {number} now - Date.now()
   */
  score(req, now = Date.now()) {
    const waitingMin = Math.max(0, (now - req.createdAt) / 60000)
    const urgencyScore = (URGENCY_WEIGHT[req.urgency] || 25) * this.weights.urgency
    let waitingScore = waitingMin * this.weights.waitingPerMin

    // starvation cap for Low/Medium — don't let them jump too fast initially, but allow gradual
    // actually we want Low to eventually catch High after ~30m, so cap boost
    if (req.urgency === 'Low' || req.urgency === 'Medium') {
      waitingScore = Math.min(waitingScore, this.weights.maxStarvationBoost + waitingMin * 0.3)
    }

    // escalation for Critical waiting >10m
    let escalation = 0
    if (req.urgency === 'Critical' && waitingMin > 10) {
      escalation = (waitingMin - 10) * this.weights.escalationPerMin
    }

    const risk = req.patientRiskWeight || 0
    const service = req.serviceRequirementWeight || 0
    return urgencyScore + waitingScore + escalation + risk + service
  }

  /** @param {any} req */
  insert(req) {
    if (!req.id) throw new Error('Request needs id')
    if (!req.createdAt) req.createdAt = Date.now()
    this.map.set(req.id, req)
    this._rebuild()
  }

  peek(now) {
    if (this.heap.length === 0) return null
    // top is max score — heap[0] after rebuild sorted desc
    this._rebuild(now)
    return this.heap[0] || null
  }

  pop(now) {
    this._rebuild(now)
    const top = this.heap.shift()
    if (top) this.map.delete(top.id)
    return top || null
  }

  /** @param {string} id */
  remove(id) {
    this.map.delete(id)
    this._rebuild()
  }

  /** @param {string} id @param {Partial<any>} patch */
  update(id, patch) {
    const req = this.map.get(id)
    if (!req) return null
    Object.assign(req, patch)
    this._rebuild()
    return req
  }

  /** Rebuild heap sorted by score desc (O(n log n) — fine for thousands) */
  _rebuild(now = Date.now()) {
    const arr = [...this.map.values()]
    arr.sort((a, b) => this.score(b, now) - this.score(a, now))
    this.heap = arr
  }

  /** Re-prioritize after network event (e.g., road closure) */
  reprioritize(now) {
    this._rebuild(now)
  }

  get size() {
    return this.map.size
  }

  /** Sorted list for UI */
  toSorted(now) {
    this._rebuild(now)
    return [...this.heap]
  }

  /** Debug: check starvation — lowest urgency wait time */
  getStarvationRisk(now = Date.now()) {
    const sorted = this.toSorted(now)
    const low = sorted.filter((r) => r.urgency === 'Low')
    if (low.length === 0) return null
    const oldest = low.reduce((a, b) => (a.createdAt < b.createdAt ? a : b))
    const wait = (now - oldest.createdAt) / 60000
    return { id: oldest.id, waitingMin: wait, score: this.score(oldest, now) }
  }
}
