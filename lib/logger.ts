/**
 * Simple structured logger. Use for server-side logging; avoid logging PII or secrets.
 * Context object is sanitized: known PII keys are redacted.
 */

const REDACT_KEYS = new Set(['password', 'email', 'token', 'secret', 'authorization', 'cookie'])

function sanitize(context: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(context)) {
    const key = k.toLowerCase()
    if (REDACT_KEYS.has(key) || key.includes('password') || key.includes('secret')) {
      out[k] = '[redacted]'
    } else {
      out[k] = v
    }
  }
  return out
}

export function logError(tag: string, message: string, context?: Record<string, unknown>): void {
  const safe = context ? sanitize(context) : {}
  console.error(JSON.stringify({ level: 'error', tag, message, ...safe }))
}

export function logInfo(tag: string, message: string, context?: Record<string, unknown>): void {
  const safe = context ? sanitize(context) : {}
  console.info(JSON.stringify({ level: 'info', tag, message, ...safe }))
}
