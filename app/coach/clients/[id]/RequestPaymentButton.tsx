'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function RequestPaymentButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setCopied(false)
    setError(null)
    try {
      const res = await fetch('/api/stripe/request-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to create payment link. Please try again.')
        return
      }
      if (data.url) {
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } else {
        setError('Could not create payment link. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2 space-y-1">
      <Button
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="mt-2"
      >
        {loading ? 'Creating…' : copied ? 'Link copied!' : 'Copy payment link'}
      </Button>
      {error && (
        <p className="text-xs text-[var(--cp-accent-danger)]">{error}</p>
      )}
    </div>
  )
}
