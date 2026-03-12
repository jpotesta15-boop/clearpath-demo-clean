import { createClient } from '@/lib/supabase/server'
import { getClientId } from '@/lib/config'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { KPIBlock } from '@/components/ui/KPIBlock'
import { ListRow } from '@/components/ui/ListRow'
import { ActionRow } from '@/components/ui/ActionRow'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ClientNotesEditor } from './ClientNotesEditor'
import { SessionHistoryWithPay } from './SessionHistoryWithPay'
import { ClientPortalAccess } from './ClientPortalAccess'
import { ClientProfileDetails } from './ClientProfileDetails'
import { ClientNameEditor } from './ClientNameEditor'
import { ClientPhoneEditor } from './ClientPhoneEditor'
import { DeleteClientButton } from './DeleteClientButton'
import { RequestPaymentButton } from './RequestPaymentButton'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('coach_id', user!.id)
    .single()

  if (!client) {
    notFound()
  }

  const [
    sessionsRes,
    programsRes,
    sessionRequestsRes,
    completedCountRes,
    upcomingCountRes,
    videosCompletedCountRes,
    lastSessionRes,
  ] = await Promise.all([
    supabase.from('sessions').select('*').eq('client_id', id).order('scheduled_time', { ascending: false }).limit(10),
    supabase.from('program_assignments').select('*, programs(*)').eq('client_id', id),
    supabase
      .from('session_requests')
      .select('id, status, amount_cents, created_at, session_products(name, duration_minutes)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('client_id', id).eq('status', 'completed'),
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id)
      .eq('status', 'confirmed')
      .gte('scheduled_time', new Date().toISOString()),
    supabase.from('video_completions').select('*', { count: 'exact', head: true }).eq('client_id', id),
    supabase
      .from('sessions')
      .select('scheduled_time')
      .eq('client_id', id)
      .in('status', ['completed', 'confirmed'])
      .order('scheduled_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const sessions = sessionsRes.data
  const programs = programsRes.data
  const sessionRequests = sessionRequestsRes.data
  const completedCount = completedCountRes.count
  const upcomingCount = upcomingCountRes.count
  const videosCompletedCount = videosCompletedCountRes.count
  const lastSession = lastSessionRes.data

  const balanceOwedCents =
    (sessionRequests ?? [])
      .filter((r: any) => ['offered', 'accepted', 'payment_pending'].includes(r.status))
      .reduce((sum: number, r: any) => sum + (r.amount_cents ?? 0), 0) ?? 0

  const lastActive = lastSession?.scheduled_time
    ? format(new Date(lastSession.scheduled_time), 'MMM d, yyyy')
    : null

  const sessionStatusToKind = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    if (['scheduled', 'completed', 'paid'].includes(status)) return 'success'
    if (['availability_submitted', 'payment_pending', 'accepted', 'offered'].includes(status)) return 'warning'
    if (status === 'cancelled') return 'danger'
    return 'neutral'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/coach/clients" className="text-[var(--cp-text-muted)]">
            ← Back to Clients
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <ClientNameEditor clientId={client.id} initialName={client.full_name} />
        <Button asChild>
          <Link href={`/coach/messages?client=${client.id}`}>Message</Link>
        </Button>
      </div>

      <Card variant="raised">
        <CardContent className="p-5 sm:p-6">
          <SectionHeader title="Stats" className="mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPIBlock label="Sessions completed" value={completedCount ?? 0} />
            <KPIBlock label="Upcoming" value={upcomingCount ?? 0} />
            <KPIBlock label="Videos completed" value={videosCompletedCount ?? 0} />
            <KPIBlock label="Last active" value={lastActive ?? '—'} />
          </div>
        </CardContent>
      </Card>

      {/* Notes prominent: full-width so coach can add/edit easily */}
      <ClientNotesEditor clientId={client.id} initialNotes={client.notes} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="raised">
          <CardContent className="p-5 sm:p-6">
            <SectionHeader title="Contact Information" className="mb-4" />
            <p className="text-sm text-[var(--cp-text-primary)]"><span className="font-medium">Email:</span> {client.email || 'N/A'}</p>
            <ClientPhoneEditor clientId={client.id} initialPhone={client.phone ?? null} />
          </CardContent>
        </Card>
        <ClientProfileDetails
          clientId={client.id}
          height={(client as { height?: string | null }).height ?? null}
          weightKg={(client as { weight_kg?: number | null }).weight_kg ?? null}
          dateOfBirth={(client as { date_of_birth?: string | null }).date_of_birth ?? null}
        />
        <ClientPortalAccess clientEmail={client.email ?? null} />
      </div>

      <Card variant="raised">
        <CardContent className="p-5 sm:p-6">
          <SectionHeader title="Assigned Programs" className="mb-4" />
          {programs && programs.length > 0 ? (
            <ul className="divide-y divide-[var(--cp-border-subtle)]">
              {programs.map((assignment: any) => (
                <li key={assignment.id}>
                  <ListRow
                    title={assignment.programs?.name ?? 'Program'}
                    subtitle={assignment.programs?.description ?? undefined}
                    className="px-0"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No programs assigned"
              description="Assign from Programs."
              className="py-6"
            />
          )}
        </CardContent>
      </Card>

      {balanceOwedCents > 0 && (
        <Card variant="raised" className="border-[var(--cp-accent-primary)]/30 bg-[var(--cp-accent-primary)]/5">
          <CardContent className="p-5 sm:p-6">
            <SectionHeader
              title="Balance owed"
              subtitle="Client can pay from their Schedule page, or copy a payment link to send them."
            />
            <p className="text-2xl font-bold text-[var(--cp-accent-primary)] mt-2">
              ${(balanceOwedCents / 100).toFixed(2)}
            </p>
            <ActionRow className="mt-3">
              <RequestPaymentButton clientId={id} />
            </ActionRow>
          </CardContent>
        </Card>
      )}

      <Card variant="raised">
        <CardContent className="p-5 sm:p-6">
          <SectionHeader
            title="Session offers"
            subtitle="Session packages sent to this client and their response."
            className="mb-4"
          />
          {sessionRequests && sessionRequests.length > 0 ? (
            <ul className="divide-y divide-[var(--cp-border-subtle)]">
              {sessionRequests.map((req: any) => {
                const product = req.session_products
                const name = product?.name ?? 'Session'
                const amountDollars = ((req.amount_cents ?? 0) / 100).toFixed(2)
                const statusLabels: Record<string, string> = {
                  offered: 'Waiting for client',
                  accepted: 'Payment in progress',
                  payment_pending: 'Payment in progress',
                  paid: 'Paid – pick time on Schedule',
                  availability_submitted: 'Waiting for you to pick time',
                  scheduled: 'Scheduled',
                  cancelled: 'Declined',
                }
                const label = statusLabels[req.status] ?? req.status
                const needsPickTime = req.status === 'availability_submitted'
                return (
                  <li key={req.id}>
                    <ListRow
                      title={`${name} – $${amountDollars}`}
                      meta={<StatusBadge status={sessionStatusToKind(req.status)} label={label} />}
                      actions={
                        needsPickTime ? (
                          <Button size="sm" asChild>
                            <Link href="/coach/schedule">Pick time</Link>
                          </Button>
                        ) : undefined
                      }
                      className="px-0"
                    />
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              title="No session offers yet"
              description="Send one from Session Packages."
              action={{ label: "Session Packages", href: "/coach/session-packages" }}
              className="py-6"
            />
          )}
        </CardContent>
      </Card>

      <Card variant="raised">
        <CardContent className="p-5 sm:p-6">
          <SectionHeader title="Session History" className="mb-4" />
          <SessionHistoryWithPay
            tenantId={getClientId()}
            sessions={sessions?.map((s) => ({
              id: s.id,
              scheduled_time: s.scheduled_time,
              status: s.status,
              notes: s.notes ?? null,
              paid_at: (s as { paid_at?: string | null }).paid_at ?? null,
              coach_id: (s as { coach_id?: string }).coach_id,
              client_id: (s as { client_id?: string }).client_id,
              amount_cents: (s as { amount_cents?: number | null }).amount_cents,
              session_request_id: (s as { session_request_id?: string | null }).session_request_id,
            })) ?? []}
          />
        </CardContent>
      </Card>

      <Card variant="raised" className="border-[var(--cp-accent-danger)]/30">
        <CardContent className="p-5 sm:p-6">
          <SectionHeader
            title="Danger zone"
            subtitle="Permanently remove this client. This will remove their assignments and session history."
            className="[&_h3]:text-[var(--cp-accent-danger)]"
          />
          <div className="mt-3">
            <DeleteClientButton clientId={client.id} clientName={client.full_name ?? undefined} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

