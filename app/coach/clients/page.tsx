import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { ClientListWithActions } from './ClientListWithActions'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email, phone, notes')
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

      {(clients ?? []).length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add your first client to start booking sessions and tracking progress."
          action={{ label: "Add your first client", href: "/coach/clients/new" }}
        />
      ) : (
        <ClientListWithActions clients={clients ?? []} />
      )}
    </div>
  )
}

