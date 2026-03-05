/**
 * Centralized API error handling: log server-side, return only safe messages to client.
 * Never expose stack traces, DB errors, or internal details to the client.
 */

import { logError } from '@/lib/logger'

const SAFE_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  429: 'Too many requests. Try again later.',
  500: 'Something went wrong. Please try again.',
  502: 'Service temporarily unavailable.',
}

export function getSafeMessage(status: number, override?: string): string {
  if (override && typeof override === 'string' && override.length < 200) {
    return override
  }
  return SAFE_MESSAGES[status] ?? SAFE_MESSAGES[500]
}

/**
 * Log an error server-side (do not include in response).
 * Prefix with a tag for filtering (e.g. [create-client], [stripe-webhook]).
 */
export function logServerError(tag: string, err: unknown, context?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err)
  const ctx = { ...(typeof context === 'object' && context !== null ? context : {}), stack: err instanceof Error ? err.stack : undefined }
  logError(tag, message, ctx)
}

/**
 * Return a safe user-facing error string for server actions.
 * Log the real error server-side and return a generic or allowed message.
 */
export function sanitizeActionError(err: unknown, allowedMessage?: string): string {
  logServerError('server-action', err)
  if (allowedMessage && typeof allowedMessage === 'string' && allowedMessage.length < 200) {
    return allowedMessage
  }
  return 'Something went wrong. Please try again.'
}
