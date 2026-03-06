'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function RequestPaymentButton({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    setCopied(false)
    try {
      const res = await fetch('/api/stripe/request-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Failed to create payment link')
        return
      }
      if (data.url) {
        await navigator.clipboard.writeText(data.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="mt-2"
    >
      {loading ? 'Creating…' : copied ? 'Link copied!' : 'Copy payment link'}
    </Button>
  )
}
