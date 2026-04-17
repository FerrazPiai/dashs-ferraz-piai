// Rate limiter generico — sliding window (Kommo) + concurrent/RPM (OpenAI, n8n).
// Uso:
//   import { createRateLimiter, withRetry } from '../lib/rate-limiter.js'
//   const kommo = createRateLimiter({ type: 'sliding-window', maxPerSecond: 3 })
//   const openai = createRateLimiter({ type: 'concurrent-rpm', maxConcurrent: 3, maxRpm: 60 })

class SlidingWindowLimiter {
  constructor(maxPerSecond) {
    this.maxPerSecond = maxPerSecond
    this.timestamps = []
  }

  async acquire() {
    return new Promise(resolve => {
      const tryAcquire = () => {
        const now = Date.now()
        this.timestamps = this.timestamps.filter(t => now - t < 1000)
        if (this.timestamps.length < this.maxPerSecond) {
          this.timestamps.push(now)
          resolve()
        } else {
          const oldest = this.timestamps[0]
          const waitMs = 1000 - (now - oldest) + 10
          setTimeout(tryAcquire, waitMs)
        }
      }
      tryAcquire()
    })
  }

  release() { /* noop */ }
}

class ConcurrentRpmLimiter {
  constructor(maxConcurrent, maxRpm) {
    this.maxConcurrent = maxConcurrent
    this.maxRpm = maxRpm
    this.active = 0
    this.rpmTimestamps = []
    this.queue = []
  }

  async acquire() {
    return new Promise(resolve => {
      this.queue.push(resolve)
      this._tryProcess()
    })
  }

  release() {
    this.active--
    this._tryProcess()
  }

  _tryProcess() {
    if (this.queue.length === 0) return
    const now = Date.now()
    this.rpmTimestamps = this.rpmTimestamps.filter(t => now - t < 60000)
    if (this.active < this.maxConcurrent && this.rpmTimestamps.length < this.maxRpm) {
      this.active++
      this.rpmTimestamps.push(now)
      const resolve = this.queue.shift()
      resolve()
    } else if (this.rpmTimestamps.length >= this.maxRpm) {
      const oldest = this.rpmTimestamps[0]
      const waitMs = 60000 - (now - oldest) + 10
      setTimeout(() => this._tryProcess(), waitMs)
    }
  }
}

export function createRateLimiter({ type, maxPerSecond, maxConcurrent, maxRpm }) {
  if (type === 'sliding-window') {
    return new SlidingWindowLimiter(maxPerSecond)
  }
  return new ConcurrentRpmLimiter(maxConcurrent, maxRpm)
}

// Retry com backoff exponencial para 429
export async function withRetry(fn, { maxRetries = 3, baseDelayMs = 1000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === maxRetries) throw err
      const is429 = err.status === 429 || String(err.message || '').includes('429')
      if (!is429 && attempt > 0) throw err
      const delay = baseDelayMs * Math.pow(2, attempt)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr
}
