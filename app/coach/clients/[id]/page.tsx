import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { ClientNotesEditor } from './ClientNotesEditor'
import { SessionHistoryWithPay } from './SessionHistoryWithPay'
import { ClientPortalAccess } from './ClientPortalAccess'
import { ClientProfileDetails } from './ClientProfileDetails'
import { ClientNameEditor } from './ClientNameEditor'
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

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', id)
    .order('scheduled_time', { ascending: false })
    .limit(10)

  const { data: programs } = await supabase
    .from('program_assignments')
    .select('*, programs(*)')
    .eq('client_id', id)

  const { data: sessionRequests } = await supabase
    .from('session_requests')
    .select('id, status, amount_cents, created_at, session_products(name, duration_minutes)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const balanceOwedCents =
    (sessionRequests ?? [])
      .filter((r: any) => ['offered', 'accepted', 'payment_pending'].includes(r.status))
      .reduce((sum: number, r: any) => sum + (r.amount_cents ?? 0), 0) ?? 0

  const { count: completedCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)
    .eq('status', 'completed')

  const { count: upcomingCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)
    .eq('status', 'confirmed')
    .gte('scheduled_time', new Date().toISOString())

  const { count: videosCompletedCount } = await supabase
    .from('video_completions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id)

  const { data: lastSession } = await supabase
    .from('sessions')
    .select('scheduled_time')
    .eq('client_id', id)
    .in('status', ['completed', 'confirmed'])
    .order('scheduled_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastActive = lastSession?.scheduled_time
    ? format(new Date(lastSession.scheduled_time), 'MMM d, yyyy')
    : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/coach/clients"
          className="text-sm font-medium text-[var(--cp-text-muted)] hover:text-[var(--cp-text-primary)]"
        >
          ← Back to Clients
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <ClientNameEditor clientId={client.id} initialName={client.full_name} />
        <Link
          href={`/coach/messages?client=${client.id}`}
          className="inline-flex items-center rounded-md bg-[var(--cp-accent-primary)] px-4 py-2 text-sm font-medium text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)]"
        >
          Message
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Sessions completed</p>
              <p className="text-lg font-semibold">{completedCount ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming</p>
              <p className="text-lg font-semibold">{upcomingCount ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Videos completed</p>
              <p className="text-lg font-semibold">{videosCompletedCount ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last active</p>
              <p className="text-lg font-semibold">{lastActive ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes prominent: full-width so coach can add/edit easily */}
      <ClientNotesEditor clientId={client.id} initialNotes={client.notes} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><span className="font-medium">Email:</span> {client.email || 'N/A'}</p>
            <p><span className="font-medium">Phone:</span> {client.phone || 'N/A'}</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Assigned Programs</CardTitle>
        </CardHeader>
        <CardContent>
          {programs && programs.length > 0 ? (
            <div className="space-y-2">
              {programs.map((assignment: any) => (
                <div key={assignment.id} className="border-b pb-2 last:border-0">
                  <p className="font-medium">{assignment.programs?.name}</p>
                  {assignment.programs?.description && (
                    <p className="text-sm text-gray-500">{assignment.programs.description}</p>
                  )}
                </div>
              ))}
            </div>
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
        <Card className="border-[var(--cp-accent-primary)]/30 bg-[var(--cp-accent-primary)]/5">
          <CardHeader>
            <CardTitle>Balance owed</CardTitle>
            <p className="text-2xl font-bold text-[var(--cp-accent-primary)]">
              ${(balanceOwedCents / 100).toFixed(2)}
            </p>
            <p className="text-sm text-[var(--cp-text-muted)]">
              Client can pay from their Schedule page, or copy a payment link to send them.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <RequestPaymentButton clientId={id} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Session offers</CardTitle>
          <p className="text-sm font-normal text-gray-500 mt-1">Session packages sent to this client and their response.</p>
        </CardHeader>
        <CardContent>
          {sessionRequests && sessionRequests.length > 0 ? (
            <div className="space-y-3">
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
                  <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{name} – ${amountDollars}</p>
                      <p className="text-sm text-gray-500">{label}</p>
                    </div>
                    {needsPickTime && (
                      <Link
                        href="/coach/schedule"
                        className="inline-flex items-center rounded-md bg-[var(--cp-accent-primary)] px-3 py-1.5 text-sm font-medium text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)]"
                      >
                        Pick time
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionHistoryWithPay
            sessions={sessions?.map((s) => ({
              id: s.id,
              scheduled_time: s.scheduled_time,
              status: s.status,
              notes: s.notes ?? null,
              paid_at: (s as { paid_at?: string | null }).paid_at ?? null,
            })) ?? []}
          />
        </CardContent>
      </Card>

      <Card className="border-[var(--cp-accent-danger)]/30">
        <CardHeader>
          <CardTitle className="text-[var(--cp-accent-danger)]">Danger zone</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)] mt-1">
            Permanently remove this client. This will remove their assignments and session history.
          </p>
        </CardHeader>
        <CardContent>
          <DeleteClientButton clientId={client.id} clientName={client.full_name ?? undefined} />
        </CardContent>
      </Card>
    </div>
  )
}

