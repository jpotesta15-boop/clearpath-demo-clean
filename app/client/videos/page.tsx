import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ClientVideosContent } from './ClientVideosContent'

export default async function ClientVideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('email', user?.email)
    .single()

  if (!client) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-[var(--cp-text-primary)]">Client not found</h1>
        <p className="text-[var(--cp-text-muted)]">
          There is no client record for this account. Contact your coach to be added and to receive a portal invite.
        </p>
        <Button asChild>
        <Link href="/login">Back to login</Link>
      </Button>
      </div>
    )
  }

  const { data: assignments } = await supabase
    .from('video_assignments')
    .select('*, videos(*)')
    .eq('client_id', client.id)

  const { data: completions } = await supabase
    .from('video_completions')
    .select('video_id')
    .eq('client_id', client.id)

  const completedVideoIds = (completions ?? []).map((c: { video_id: string }) => c.video_id)

  return (
    <ClientVideosContent
      clientId={client.id}
      assignments={assignments ?? []}
      completedVideoIds={completedVideoIds}
    />
  )
}

