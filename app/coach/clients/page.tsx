import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
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
    <div className="space-y-8">
      <PageHeader
        title="Clients"
        subtitle="Manage your roster"
        primaryAction={
          <Link href="/coach/clients/new">
            <Button>
              Add client
            </Button>
          </Link>
        }
      />

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

