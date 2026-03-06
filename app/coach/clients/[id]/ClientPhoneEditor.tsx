'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateClientProfileAction } from './actions'

type Props = {
  clientId: string
  initialPhone: string | null
}

export function ClientPhoneEditor({ clientId, initialPhone }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [error, setError] = useState<string | null>(null)

  const displayPhone = (initialPhone && initialPhone.trim()) || 'N/A'

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const res = await updateClientProfileAction(clientId, {
      phone: phone.trim() || null,
    })
    setSaving(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p>
          <span className="font-medium">Phone:</span> {displayPhone}
        </p>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Phone</label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +1 555 123 4567"
          className="max-w-xs bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
        />
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(false)
            setPhone(initialPhone ?? '')
            setError(null)
          }}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-[var(--cp-accent-danger)]">{error}</p>}
    </div>
  )
}
