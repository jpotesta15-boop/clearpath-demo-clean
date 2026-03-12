'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button } from '@/components/ui/button'
import { ActionRow } from '@/components/ui/ActionRow'
import { createClient } from '@/lib/supabase/client'

export function ClientNotesEditor({
  clientId,
  initialNotes,
}: {
  clientId: string
  initialNotes: string | null
}) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from('clients')
      .update({ notes: notes || null })
      .eq('id', clientId)
    setSaving(false)
    if (!error) setSaved(true)
  }

  return (
    <Card variant="raised">
      <CardContent className="p-5 sm:p-6">
        <SectionHeader title="Notes" subtitle="Add notes about this client. Only you can see these." className="mb-4" />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this client..."
          className="w-full min-h-[120px] rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] placeholder:text-[var(--cp-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
          rows={4}
        />
        <ActionRow className="mt-3">
          {saved && <span className="text-sm text-[var(--cp-accent-success)]">Saved</span>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save notes'}
          </Button>
        </ActionRow>
      </CardContent>
    </Card>
  )
}
