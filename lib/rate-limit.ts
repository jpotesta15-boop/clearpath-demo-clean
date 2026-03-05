/**
 * In-memory rate limiter (sliding window by key).
 * Use for API routes and auth callback. For multi-instance deployments, use Redis (e.g. @upstash/ratelimit).
 */

const store = new Map<string, number[]>()
const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX = 30

function prune(key: string, windowMs: number, now: number): void {
  const timestamps = store.get(key)
  if (!timestamps) return
  const cutoff = now - windowMs
  const kept = timestamps.filter((t) => t > cutoff)
  if (kept.length === 0) store.delete(key)
  else store.set(key, kept)
}

export interface RateLimitOptions {
  windowMs?: number
  max?: number
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number } {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS
  const max = options.max ?? DEFAULT_MAX
  const now = Date.now()
  prune(key, windowMs, now)
  const timestamps = store.get(key) ?? []
  if (timestamps.length >= max) {
    return { allowed: false, remaining: 0 }
  }
  timestamps.push(now)
  store.set(key, timestamps)
  return { allowed: true, remaining: max - timestamps.length }
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? 'unknown'
  return ip
}
