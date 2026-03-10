import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { format } from 'date-fns'

interface CoachClientExperience {
  welcome_title: string | null
  welcome_body: string | null
  hero_image_url: string | null
  intro_video_source: string | null
  intro_video_url: string | null
  show_welcome_block: boolean | null
}

export default async function ClientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get client record
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('email', user?.email)
    .single()

  if (!client) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-[var(--cp-text-primary)]">No client record for this account</h1>
        <p className="text-[var(--cp-text-muted)]">
          You&apos;re signed in as <strong className="text-[var(--cp-text-primary)]">{user?.email ?? 'this account'}</strong>. Your coach needs to add you as a client with this exact email. Ask them to add you in Clients, then use <strong>Create login</strong> so you can sign in here.
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)]"
        >
          Back to login
        </a>
      </div>
    )
  }

  const { data: upcomingSessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', client.id)
    .eq('status', 'confirmed')
    .gte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true })
    .limit(5)

  const { data: programs } = await supabase
    .from('program_assignments')
    .select('*, programs(*)')
    .eq('client_id', client.id)

  const { data: dailyMessages } = await supabase
    .from('coach_daily_messages')
    .select('*')
    .eq('coach_id', client.coach_id)
    .order('effective_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)

  const dailyMessage = dailyMessages && dailyMessages.length > 0 ? dailyMessages[0] : null

  // Client experience configuration from coach
  let clientExperience: CoachClientExperience | null = null
  if (client.coach_id && client.client_id) {
    const { data } = await supabase
      .from('coach_client_experience')
      .select('welcome_title, welcome_body, hero_image_url, intro_video_source, intro_video_url, show_welcome_block')
      .eq('coach_id', client.coach_id)
      .eq('tenant_id', client.client_id)
      .maybeSingle<CoachClientExperience>()

    clientExperience = data ?? null
  }

  const { data: unpaidRequests } = await supabase
    .from('session_requests')
    .select('id, amount_cents')
    .eq('client_id', client.id)
    .in('status', ['offered', 'accepted', 'payment_pending'])

  const balanceOwedCents = (unpaidRequests ?? []).reduce((sum: number, r: any) => sum + (r.amount_cents ?? 0), 0)

  const hasContent =
    (upcomingSessions && upcomingSessions.length > 0) ||
    (programs && programs.length > 0) ||
    dailyMessage

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Home</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">Welcome back, {client.full_name}</p>
      </div>

      {clientExperience?.show_welcome_block !== false && (
        <Card className="shadow-[var(--cp-shadow-soft)] border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)]">
          <CardContent className="pt-6 space-y-4">
            {(clientExperience.welcome_title || clientExperience.welcome_body) && (
              <div className="space-y-1">
                {clientExperience.welcome_title && (
                  <h2 className="text-lg font-semibold text-[var(--cp-text-primary)]">
                    {clientExperience.welcome_title}
                  </h2>
                )}
                {clientExperience.welcome_body && (
                  <p className="text-sm text-[var(--cp-text-muted)] whitespace-pre-wrap break-words">
                    {clientExperience.welcome_body}
                  </p>
                )}
              </div>
            )}

            {(clientExperience.hero_image_url || clientExperience.intro_video_url) && (
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {clientExperience.hero_image_url && (
                  <div className="flex-1">
                    <div className="overflow-hidden rounded-xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-subtle)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={clientExperience.hero_image_url}
                        alt="Coach portal hero"
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {clientExperience.intro_video_url && (
                  <div className="flex-1">
                    <div className="aspect-video overflow-hidden rounded-xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-subtle)]">
                      <iframe
                        src={clientExperience.intro_video_url}
                        title="Intro video"
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {balanceOwedCents > 0 && (
        <Card className="border-[var(--cp-accent-primary)]/30 bg-[var(--cp-accent-primary)]/5">
          <CardContent className="pt-6">
            <p className="font-medium text-[var(--cp-text-primary)]">You owe ${(balanceOwedCents / 100).toFixed(2)}</p>
            <p className="text-sm text-[var(--cp-text-muted)] mt-1">Pay for your session offers on the Schedule page.</p>
            <a
              href="/client/schedule"
              className="mt-3 inline-flex items-center rounded-md font-medium px-4 py-2 bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)] text-sm"
            >
              Pay now
            </a>
          </CardContent>
        </Card>
      )}

      {!hasContent && (
        <Card className="shadow-[var(--cp-shadow-soft)] border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)]">
          <CardContent className="pt-6">
            <p className="text-[var(--cp-text-muted)]">
              Nothing scheduled yet. Your coach may send you an offer — check Schedule or Messages to get started.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="/client/schedule"
                className="inline-flex items-center rounded-md font-medium px-4 py-2 bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)] text-sm"
              >
                View schedule
              </a>
              <a
                href="/client/messages"
                className="inline-flex items-center rounded-md font-medium px-4 py-2 border border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)] hover:bg-[var(--cp-bg-subtle)] text-sm"
              >
                Messages
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {dailyMessage && (
        <Card className="shadow-[var(--cp-shadow-soft)] border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)]">
          <CardHeader>
            <CardTitle>Message from your coach</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--cp-text-primary)] whitespace-pre-wrap break-words">
              {dailyMessage.content}
            </p>
            {dailyMessage.effective_at && (
              <p className="mt-2 text-xs text-[var(--cp-text-muted)]">
                For {dailyMessage.effective_at}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-[var(--cp-shadow-soft)] border-[var(--cp-border-subtle)]">
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions && upcomingSessions.length > 0 ? (
              <div className="space-y-4 animate-[fadeInUp_0.35s_ease-out]">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="border-b border-[var(--cp-border-subtle)] pb-4 last:border-0">
                    <p className="font-medium text-[var(--cp-text-primary)]">
                      {format(new Date(session.scheduled_time), 'MMM d, yyyy h:mm a')}
                    </p>
                    <p className="text-sm text-[var(--cp-text-muted)]">Status: {session.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No upcoming sessions"
                description="Nothing scheduled yet. Your coach may send you an offer."
                action={{ label: "View schedule", href: "/client/schedule" }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-[var(--cp-shadow-soft)] border-[var(--cp-border-subtle)]">
          <CardHeader>
            <CardTitle>My Programs</CardTitle>
          </CardHeader>
          <CardContent>
            {programs && programs.length > 0 ? (
              <div className="space-y-2 animate-[fadeInUp_0.35s_ease-out]">
                {programs.map((assignment: any) => (
                  <div key={assignment.id} className="border-b border-[var(--cp-border-subtle)] pb-2 last:border-0">
                    <p className="font-medium text-[var(--cp-text-primary)]">{assignment.programs?.name}</p>
                    {assignment.programs?.description && (
                      <p className="text-sm text-[var(--cp-text-muted)]">{assignment.programs.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No programs assigned"
                description="Your coach will assign programs here."
                action={{ label: "View programs", href: "/client/programs" }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

