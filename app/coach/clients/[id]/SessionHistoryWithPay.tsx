'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { format } from 'date-fns'

type SessionRow = {
  id: string
  scheduled_time: string
  status: string
  notes: string | null
  paid_at: string | null
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
    <div className="space-y-2">
      {sessions.map((session) => (
        <div key={session.id} className="border-b pb-2 last:border-0">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <p className="font-medium">
                {format(new Date(session.scheduled_time), 'MMM d, yyyy h:mm a')}
              </p>
              <p className="text-xs text-gray-500">
                {session.paid_at
                  ? `Paid ${format(new Date(session.paid_at), 'MMM d, yyyy')}`
                  : 'Unpaid'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs rounded ${
                  session.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  session.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}
              >
                {session.status}
              </span>
              {!session.paid_at && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkAsPaid(session.id)}
                >
                  Mark as paid
                </Button>
              )}
            </div>
          </div>
          {session.notes && (
            <p className="text-sm text-gray-500 mt-1">{session.notes}</p>
          )}
        </div>
      ))}
    </div>
  )
}
