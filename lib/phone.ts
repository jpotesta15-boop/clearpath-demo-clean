/**
 * Normalize phone for Twilio E.164 format.
 * US 10-digit numbers get +1 prefix.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return phone.trim()
}
