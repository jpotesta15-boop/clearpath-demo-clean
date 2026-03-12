import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
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
        <p className="text-sm text-[var(--cp-text-muted)]">
          What happens next? Once they add you and create a login, you can sign in here and use your portal.
        </p>
        <Button asChild>
          <Link href="/login">Back to login</Link>
        </Button>
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
    <div className="space-y-8">
      <PageHeader
        title="Home"
        subtitle={`Welcome back, ${client.full_name}`}
      />

      {clientExperience && clientExperience.show_welcome_block !== false && (
        <Card variant="raised">
          <CardContent className="p-5 sm:p-6 space-y-4">
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
        <Card variant="raised" className="border-[var(--cp-accent-primary)]/30 bg-[var(--cp-accent-primary)]/5">
          <CardContent className="p-5 sm:p-6">
            <p className="font-medium text-[var(--cp-text-primary)]">You owe ${(balanceOwedCents / 100).toFixed(2)}</p>
            <p className="text-sm text-[var(--cp-text-muted)] mt-1">Pay for your session offers on the Schedule page.</p>
            <div className="mt-3">
              <Button size="sm" asChild>
                <a href="/client/schedule">
                  Pay now
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasContent && (
        <Card variant="raised">
          <CardContent className="p-5 sm:p-6">
            <p className="text-[var(--cp-text-muted)]">
              To get started, tell your coach when you&apos;re free.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button size="sm" asChild>
                <Link href="/client/schedule">Go to Schedule</Link>
              </Button>
              <Link
                href="/client/messages"
                className="text-sm text-[var(--cp-text-muted)] hover:text-[var(--cp-text-primary)]"
              >
                Messages
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {dailyMessage && (
        <Card variant="raised">
          <CardContent className="p-5 sm:p-6">
            <SectionHeader title="Message from your coach" className="mb-4" />
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
        <Card variant="raised">
          <CardContent className="p-5 sm:p-6">
            <SectionHeader title="Upcoming Sessions" className="mb-3" />
            {upcomingSessions && upcomingSessions.length > 0 ? (
              <div className="space-y-4 animate-[fadeInUp_0.35s_ease-out]">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="border-b border-[var(--cp-border-subtle)] pb-4 last:border-0">
                    <p className="font-medium text-[var(--cp-text-primary)]">
                      {format(new Date(session.scheduled_time), 'MMM d, yyyy h:mm a')}
                    </p>
                    <StatusBadge
                      status={
                        session.status === 'confirmed'
                          ? 'success'
                          : session.status === 'pending'
                            ? 'warning'
                            : session.status === 'canceled' || session.status === 'cancelled'
                              ? 'danger'
                              : 'neutral'
                      }
                      label={session.status}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No upcoming sessions"
                description="Go to Schedule to request a time or respond to offers."
                action={{ label: "Go to Schedule", href: "/client/schedule" }}
              />
            )}
          </CardContent>
        </Card>

        <Card variant="raised">
          <CardContent className="p-5 sm:p-6">
            <SectionHeader title="My Programs" className="mb-4" />
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
                description="Your coach will assign programs here. Check back later."
                action={{ label: "View programs", href: "/client/programs" }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

