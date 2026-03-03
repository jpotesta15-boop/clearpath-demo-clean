import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

function getInitials(name: string | null | undefined): string {
  if (!name) return 'CP'
  const parts = name.trim().split(' ')
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase() || 'CP'
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('coach_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Clients</h1>
          <p className="mt-1 text-sm text-[var(--cp-text-muted)]">Manage your roster</p>
        </div>
        <Link
          href="/coach/clients/new"
          className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cp-border-focus)]"
        >
          Add Client
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(clients ?? []).map((client) => (
          <Link key={client.id} href={`/coach/clients/${client.id}`}>
            <Card variant="raised" interactive className="h-full">
              <CardHeader className="flex flex-row items-center space-y-0 gap-3 pb-4">
                <div className="h-10 w-10 rounded-full bg-[var(--cp-accent-primary-soft)] flex items-center justify-center text-xs font-semibold text-[var(--cp-accent-primary)]">
                  {getInitials(client.full_name)}
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">
                    {client.full_name || 'Unnamed client'}
                  </CardTitle>
                  {client.email && (
                    <p className="text-xs text-[var(--cp-text-subtle)] truncate">
                      {client.email}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {client.phone && (
                  <p className="text-xs text-[var(--cp-text-muted)]">
                    <span className="font-medium text-[var(--cp-text-primary)]">Phone:</span>{' '}
                    {client.phone}
                  </p>
                )}
                {client.notes && (
                  <p className="mt-1 text-xs text-[var(--cp-text-muted)] line-clamp-3">
                    {client.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

