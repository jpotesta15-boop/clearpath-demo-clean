/**
 * Client-safe error messages. Use when displaying errors from Supabase auth or client-side calls.
 * Never expose raw backend/auth error strings to the UI.
 *
 * XSS: Message and note content are rendered as React text (e.g. {message.content}), not as HTML,
 * so they are escaped by default. If rich text or HTML is added later, use a sanitizer (e.g. DOMPurify).
 */

export const AUTH_LOGIN_FAILED = 'Sign-in failed. Please try again.'
export const AUTH_FORGOT_FAILED = 'Could not send reset email. Please try again.'
export const AUTH_SET_PASSWORD_FAILED = 'Could not update password. Please try again.'
export const GENERIC_FAILED = 'Something went wrong. Please try again.'

/** Map auth error to a safe message (client-safe, no server import). */
export function getSafeAuthMessage(context: 'login' | 'forgot' | 'set-password'): string {
  switch (context) {
    case 'login':
      return AUTH_LOGIN_FAILED
    case 'forgot':
      return AUTH_FORGOT_FAILED
    case 'set-password':
      return AUTH_SET_PASSWORD_FAILED
    default:
      return GENERIC_FAILED
  }
}
