/**
 * Rate limiter: uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
 * otherwise falls back to in-memory (single-instance only).
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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

let upstashRatelimit: Ratelimit | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  upstashRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: false,
  })
}

export async function checkRateLimitAsync(
  key: string,
  options: RateLimitOptions = {}
): Promise<{ allowed: boolean; remaining: number }> {
  if (upstashRatelimit) {
    const res = await upstashRatelimit.limit(key)
    return { allowed: res.success, remaining: res.remaining }
  }
  const sync = checkRateLimit(key, options)
  return Promise.resolve(sync)
}
