/**
 * Binary Min-Heap for Dijkstra/A* priority queue
 * Stores items as { key, priority, value }
 * priority = cost (number), key = nodeId
 */

export class MinHeap {
  constructor() {
    /** @type {Array<{key: string, priority: number, value?: any}>} */
    this.heap = []
  }

  get size() {
    return this.heap.length
  }

  isEmpty() {
    return this.heap.length === 0
  }

  peek() {
    return this.heap[0] || null
  }

  /**
   * @param {string} key
   * @param {number} priority
   * @param {any} [value]
   */
  push(key, priority, value) {
    const node = { key, priority, value }
    this.heap.push(node)
    this._bubbleUp(this.heap.length - 1)
  }

  pop() {
    if (this.heap.length === 0) return null
    const top = this.heap[0]
    const end = this.heap.pop()
    if (this.heap.length > 0) {
      this.heap[0] = end
      this._sinkDown(0)
    }
    return top
  }

  /** @private */
  _bubbleUp(idx) {
    const node = this.heap[idx]
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2)
      const parent = this.heap[parentIdx]
      if (node.priority >= parent.priority) break
      this.heap[parentIdx] = node
      this.heap[idx] = parent
      idx = parentIdx
    }
  }

  /** @private */
  _sinkDown(idx) {
    const len = this.heap.length
    const node = this.heap[idx]
    while (true) {
      let leftIdx = 2 * idx + 1
      let rightIdx = 2 * idx + 2
      let swap = null

      if (leftIdx < len) {
        if (this.heap[leftIdx].priority < node.priority) swap = leftIdx
      }
      if (rightIdx < len) {
        const right = this.heap[rightIdx]
        const target = swap === null ? node.priority : this.heap[leftIdx].priority
        if (right.priority < target) swap = rightIdx
      }
      if (swap === null) break
      this.heap[idx] = this.heap[swap]
      this.heap[swap] = node
      idx = swap
    }
  }
}
