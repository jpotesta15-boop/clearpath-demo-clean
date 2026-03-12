'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateClientProfileAction } from './actions'

function ageFromDob(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age >= 0 ? age : null
}

type Props = {
  clientId: string
  height: string | null
  weightKg: number | null
  dateOfBirth: string | null
}

export function ClientProfileDetails({ clientId, height, weightKg, dateOfBirth }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [heightVal, setHeightVal] = useState(height ?? '')
  const [weightVal, setWeightVal] = useState(weightKg != null ? String(weightKg) : '')
  const [dobVal, setDobVal] = useState(dateOfBirth ?? '')
  const [error, setError] = useState<string | null>(null)

  const age = ageFromDob(dateOfBirth ?? undefined)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const res = await updateClientProfileAction(clientId, {
      height: heightVal.trim() || null,
      weight_kg: weightVal.trim() ? parseFloat(weightVal) : null,
      date_of_birth: dobVal.trim() || null,
    })
    setSaving(false)
    if (res.error) {
      setError(res.error)
    } else {
      setEditing(false)
      router.refresh()
    }
  }

  return (
    <Card variant="raised">
      <CardContent className="p-5 sm:p-6">
        <SectionHeader title="Profile details" subtitle="Height, weight, and date of birth. Optional." className="mb-4" />
        <div className="space-y-3">
        {editing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Height</label>
              <Input
                value={heightVal}
                onChange={(e) => setHeightVal(e.target.value)}
                placeholder="e.g. 5 ft 10 in or 180 cm"
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Weight (kg)</label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={weightVal}
                onChange={(e) => setWeightVal(e.target.value)}
                placeholder="e.g. 70"
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Date of birth</label>
              <Input
                type="date"
                value={dobVal}
                onChange={(e) => setDobVal(e.target.value)}
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            {error && <p className="text-sm text-[var(--cp-accent-danger)]">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-[var(--cp-text-muted)]">Height</p>
                <p className="font-medium text-[var(--cp-text-primary)]">{height || '—'}</p>
              </div>
              <div>
                <p className="text-[var(--cp-text-muted)]">Weight (kg)</p>
                <p className="font-medium text-[var(--cp-text-primary)]">{weightKg != null ? weightKg : '—'}</p>
              </div>
              <div>
                <p className="text-[var(--cp-text-muted)]">Age</p>
                <p className="font-medium text-[var(--cp-text-primary)]">
                  {age != null ? `${age} years` : dateOfBirth ? formatDate(dateOfBirth) : '—'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        )}
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}
