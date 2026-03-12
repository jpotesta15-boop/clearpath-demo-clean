'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ListRow } from '@/components/ui/ListRow'
import { format } from 'date-fns'

type SessionRow = {
  id: string
  scheduled_time: string
  status: string
  notes: string | null
  paid_at: string | null
}

function sessionStatusToKind(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'confirmed') return 'info'
  if (status === 'cancelled') return 'danger'
  return 'warning'
}

export function SessionHistoryWithPay({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter()
  const supabase = createClient()

  const handleMarkAsPaid = async (sessionId: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ paid_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (!error) router.refresh()
  }

  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        title="No sessions yet"
        description="Sessions will appear here after you schedule them."
        className="py-6"
      />
    )
  }

  return (
    <ul className="divide-y divide-[var(--cp-border-subtle)]">
      {sessions.map((session) => (
        <li key={session.id}>
          <ListRow
            title={format(new Date(session.scheduled_time), 'MMM d, yyyy h:mm a')}
            subtitle={session.notes ?? (session.paid_at ? `Paid ${format(new Date(session.paid_at), 'MMM d, yyyy')}` : 'Unpaid')}
            meta={<StatusBadge status={sessionStatusToKind(session.status)} label={session.status} />}
            actions={
              !session.paid_at ? (
                <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(session.id)}>
                  Mark as paid
                </Button>
              ) : undefined
            }
            className="px-0"
          />
        </li>
      ))}
    </ul>
  )
}
