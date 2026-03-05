'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateClientProfileAction } from './actions'

type Props = {
  clientId: string
  initialName: string | null
}

export function ClientNameEditor({ clientId, initialName }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(initialName ?? '')
  const [error, setError] = useState<string | null>(null)

  const displayName = (initialName && initialName.trim()) || 'Unnamed client'

  const handleSave = async () => {
    const next = name.trim()
    setSaving(true)
    setError(null)
    const res = await updateClientProfileAction(clientId, {
      full_name: next || null,
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
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">{displayName}</h1>
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Edit name
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Client name</label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          className="max-w-xs"
        />
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(false)
            setName(initialName ?? '')
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

