'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteClientAction } from './actions'

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const result = await deleteClientAction(clientId)
      if (result?.error) {
        setError(result.error)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="border-[var(--cp-accent-danger)]/50 text-[var(--cp-accent-danger)] hover:bg-[var(--cp-accent-danger)]/10"
        onClick={() => setConfirming(true)}
      >
        Delete client
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--cp-text-muted)]">
          Permanently remove {clientName || 'this client'}? Assignments and session history will be removed.
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setConfirming(false); setError(null) }}
          disabled={deleting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-[var(--cp-accent-danger)] text-white hover:opacity-90"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-[var(--cp-accent-danger)]">{error}</p>
      )}
    </div>
  )
}
