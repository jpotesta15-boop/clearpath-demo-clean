'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { DashboardHero } from '@/components/dashboard/DashboardHero'
import { DashboardKPIStrip } from '@/components/dashboard/DashboardKPIStrip'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Button, buttonClasses } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ListRow } from '@/components/ui/ListRow'
import { ActionRow } from '@/components/ui/ActionRow'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { getClientId } from '@/lib/config'

type Session = {
  id: string
  scheduled_time: string
  clients?: { full_name?: string } | null
}

type WeekDatum = { weekLabel: string; revenue?: number; count?: number }

type AvailabilityRequest = {
  id: string
  clients?: { full_name?: string }[] | null
  session_products?: { name?: string }[] | null
}

type ClientRow = { id: string; full_name?: string | null; email?: string | null }

type RecentMessageRow = {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  created_at: string
  sender_name?: string | null
  recipient_name?: string | null
}

type DashboardContentProps = {
  tagline?: string | null
  stripeConnectAccountId: string | null
  totalClients: number
  upcomingCount: number
  pendingCount: number
  revenue: number
  revenueThisWeek: number
  unseenMessagesCount: number
  initialDailyMessage: { content: string; effective_at: string | null; created_at: string } | null
  nextSession: Session | null
  upcomingSessions: Session[]
  pendingSessions: Session[]
  completedCount: number
  canceledCount: number
  currentTime: string
  revenueByWeek: WeekDatum[]
  availabilityRequests: AvailabilityRequest[]
  clients: ClientRow[]
  recentMessages: RecentMessageRow[]
  currentUserId: string
  onboardingDismissed: boolean
  hasClients: boolean
  hasAvailability: boolean
  hasSessionPackage: boolean
  onDismissOnboarding: () => Promise<void>
}

export function DashboardContent({
  tagline,
  stripeConnectAccountId,
  totalClients,
  upcomingCount,
  pendingCount,
  revenue,
  revenueThisWeek,
  unseenMessagesCount,
  initialDailyMessage,
  nextSession,
  upcomingSessions,
  pendingSessions,
  completedCount,
  canceledCount,
  currentTime: initialCurrentTime,
  revenueByWeek,
  availabilityRequests,
  clients,
  recentMessages,
  currentUserId,
  onboardingDismissed,
  hasClients,
  hasAvailability,
  hasSessionPackage,
  onDismissOnboarding,
}: DashboardContentProps) {
  const [connectLoading, setConnectLoading] = useState(false)
  const [dismissingOnboarding, setDismissingOnboarding] = useState(false)
  const [currentTime, setCurrentTime] = useState(initialCurrentTime)
  const [broadcastContent, setBroadcastContent] = useState(initialDailyMessage?.content ?? '')
  const [broadcastSaving, setBroadcastSaving] = useState(false)
  const [broadcastError, setBroadcastError] = useState<string | null>(null)
  const [lastBroadcast, setLastBroadcast] = useState(initialDailyMessage)
  const [stripeConnectError, setStripeConnectError] = useState<string | null>(null)

  const supabase = createClient()
  const tenantId = getClientId()

  useEffect(() => {
    const tick = () => setCurrentTime(format(new Date(), 'h:mm a · EEEE, MMMM d'))
    const id = setInterval(tick, 60 * 1000)
    return () => clearInterval(id)
  }, [])

  async function handleBroadcastSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!broadcastContent.trim() || broadcastSaving) return
    setBroadcastSaving(true)
    setBroadcastError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setBroadcastError('You need to be signed in.')
        setBroadcastSaving(false)
        return
      }
      const payload: any = {
        coach_id: user.id,
        client_id: tenantId,
        content: broadcastContent.trim(),
      }
      const { data, error } = await supabase
        .from('coach_daily_messages')
        .insert(payload)
        .select('content, effective_at, created_at')
        .single()
      if (error) {
        setBroadcastError('Could not post message. Please try again.')
      } else if (data) {
        setLastBroadcast(data as typeof initialDailyMessage)
      }
    } catch {
      setBroadcastError('Could not post message. Please try again.')
    }
    setBroadcastSaving(false)
  }

  async function handleConnectStripe() {
    setConnectLoading(true)
    setStripeConnectError(null)
    try {
      const res = await fetch('/api/stripe/connect/account-link', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStripeConnectError(data.error ?? 'Failed to start Stripe Connect')
        return
      }
      if (data.url) window.location.href = data.url
    } finally {
      setConnectLoading(false)
    }
  }

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div initial="hidden" animate="show" variants={container}>
        <div className="flex flex-col gap-3 mb-2">
          <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Welcome back</h1>
          <p className="text-sm text-[var(--cp-text-muted)]">
            {tagline?.trim() ?? 'Your coaching at a glance — focus on what matters this week.'}
          </p>
        </div>

        {/* Hero band: next session + key metrics */}
        <motion.div variants={item}>
          <DashboardHero
            currentTime={currentTime}
            nextSession={nextSession}
            revenueThisWeek={revenueThisWeek}
            upcomingCount={upcomingCount}
            pendingCount={pendingCount}
            unseenMessagesCount={unseenMessagesCount}
          />
        </motion.div>

        {!onboardingDismissed && (
          <motion.div variants={item}>
            <Card variant="raised">
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  title="Get started"
                  meta={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        setDismissingOnboarding(true)
                        await onDismissOnboarding()
                        setDismissingOnboarding(false)
                      }}
                      disabled={dismissingOnboarding}
                    >
                      {dismissingOnboarding ? 'Dismissing…' : 'Dismiss'}
                    </Button>
                  }
                />
                <p className="text-sm text-[var(--cp-text-muted)] mt-2">
                  Add a client, create a package, then send an offer from Schedule.
                </p>
                <ul className="mt-4 space-y-3">
                  <li className="flex items-center gap-3">
                    {hasClients ? (
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]" aria-hidden>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--cp-border-subtle)] text-[var(--cp-text-muted)] text-xs font-medium" aria-hidden>1</span>
                    )}
                    <div>
                      <Link
                        href="/coach/clients/new"
                        className={hasClients ? 'text-sm text-[var(--cp-text-muted)]' : buttonClasses({ variant: 'ghost', size: 'sm' })}
                      >
                        Add your first client
                      </Link>
                      <p className="text-xs text-[var(--cp-text-muted)] mt-0.5">So you can send them session offers.</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    {hasAvailability ? (
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]" aria-hidden>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--cp-border-subtle)] text-[var(--cp-text-muted)] text-xs font-medium" aria-hidden>2</span>
                    )}
                    <div>
                      <Link
                        href="/coach/schedule"
                        className={hasAvailability ? 'text-sm text-[var(--cp-text-muted)]' : buttonClasses({ variant: 'ghost', size: 'sm' })}
                      >
                        Schedule your first session
                      </Link>
                      <p className="text-xs text-[var(--cp-text-muted)] mt-0.5">Where you pick a time and confirm bookings.</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3">
                    {hasSessionPackage ? (
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]" aria-hidden>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--cp-border-subtle)] text-[var(--cp-text-muted)] text-xs font-medium" aria-hidden>3</span>
                    )}
                    <div>
                      <Link
                        href="/coach/session-packages"
                        className={hasSessionPackage ? 'text-sm text-[var(--cp-text-muted)]' : buttonClasses({ variant: 'ghost', size: 'sm' })}
                      >
                        Create a session package
                      </Link>
                      <p className="text-xs text-[var(--cp-text-muted)] mt-0.5">So clients can pay and book.</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* KPI strip */}
        <motion.div variants={item}>
          <DashboardKPIStrip
            revenue={revenue}
            revenueThisWeek={revenueThisWeek}
            totalClients={totalClients}
          />
        </motion.div>

        {/* Revenue chart – larger, prominent */}
        <motion.div variants={item}>
          <Card variant="raised">
            <CardContent className="p-5 sm:p-6">
              <SectionHeader title="Revenue by week" className="mb-4" />
              <div className="h-[280px] sm:h-[320px] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={revenueByWeek}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--cp-border-subtle)" />
                    <XAxis dataKey="weekLabel" tick={{ fill: 'var(--cp-text-muted)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--cp-text-muted)', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--cp-bg-elevated)', border: '1px solid var(--cp-border-subtle)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--cp-text-primary)' }}
                      formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Revenue']}
                      labelFormatter={(label) => label}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="var(--cp-accent-primary)"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      <motion.div variants={item}>
        <Card variant="raised">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <SectionHeader
                  title="Accept session payments"
                  subtitle={
                    stripeConnectAccountId
                      ? 'Connected. Clients can pay for offers.'
                      : 'Connect Stripe to accept payments.'
                  }
                />
              </div>
              <div className="shrink-0">
                {stripeConnectAccountId ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status="success" label="Stripe connected" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleConnectStripe}
                        disabled={connectLoading}
                      >
                        {connectLoading ? 'Opening…' : 'Reconnect'}
                      </Button>
                    </div>
                    {stripeConnectError && (
                      <p className="text-xs text-[var(--cp-accent-danger)]">{stripeConnectError}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleConnectStripe}
                      disabled={connectLoading}
                    >
                      {connectLoading ? 'Opening…' : 'Connect Stripe'}
                    </Button>
                    {stripeConnectError && (
                      <p className="text-xs text-[var(--cp-accent-danger)]">{stripeConnectError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card variant="raised" interactive>
          <Link
            href="/coach/analytics"
            className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)] focus-visible:ring-offset-2"
          >
            <div className="min-w-0 text-left">
              <SectionHeader
                title="Revenue & activity"
                subtitle="Monthly revenue, sessions, and spending."
              />
            </div>
            <span className="text-[var(--cp-accent-primary)] font-medium text-sm shrink-0">View analytics →</span>
          </Link>
        </Card>
      </motion.div>

      {/* Pipeline band: sessions + communication, arranged in two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <motion.div variants={item}>
            <Card variant="raised">
              <CardContent className="p-5 sm:p-6">
                <SectionHeader title="Next up" className="mb-4" />
                {upcomingSessions.length > 0 ? (
                  <ul className="divide-y divide-[var(--cp-border-subtle)]">
                    {upcomingSessions.slice(0, 2).map((session) => (
                      <li key={session.id}>
                        <ListRow
                          title={session.clients?.full_name ?? 'Client'}
                          subtitle={format(new Date(session.scheduled_time), 'EEE, MMM d · h:mm a')}
                          actions={
                            <Button variant="ghost" size="sm" asChild>
                              <Link href="/coach/schedule">View schedule →</Link>
                            </Button>
                          }
                          className="px-0"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title="Nothing scheduled next"
                    description="Your week is open. Schedule a session when you're ready."
                    action={{ label: 'Schedule a session', href: '/coach/schedule' }}
                    className="py-6"
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card
              variant="raised"
              className={availabilityRequests.length > 0 ? 'border-[var(--cp-accent-warning)] bg-[var(--cp-accent-warning)]/5' : undefined}
            >
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  title="Ready to schedule"
                  subtitle={
                    availabilityRequests.length > 0
                      ? 'Pick a time in Schedule to confirm.'
                      : 'Clients appear here after they pay and submit availability.'
                  }
                  meta={
                    availabilityRequests.length > 0 ? (
                      <StatusBadge
                        status="warning"
                        label={availabilityRequests.length > 99 ? '99+' : String(availabilityRequests.length)}
                      />
                    ) : null
                  }
                  className="mb-4"
                />
                {availabilityRequests.length > 0 ? (
                  <>
                    <ul className="divide-y divide-[var(--cp-border-subtle)]">
                      {availabilityRequests.map((req) => (
                        <li key={req.id}>
                          <ListRow
                            title={req.clients?.[0]?.full_name ?? 'Client'}
                            subtitle={`${req.session_products?.[0]?.name ?? 'Session'} — needs a time confirmed`}
                            actions={
                              <Button variant="ghost" size="sm" asChild>
                                <Link href="/coach/schedule">Confirm & book →</Link>
                              </Button>
                            }
                            className="px-0"
                          />
                        </li>
                      ))}
                    </ul>
                    <ActionRow>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/coach/schedule">Open Schedule →</Link>
                      </Button>
                    </ActionRow>
                  </>
                ) : (
                  <EmptyState
                    title="No availability requests"
                    description="When clients pay and submit availability, they'll appear here. Go to Schedule to book with a client now."
                    action={{ label: 'Open Schedule', href: '/coach/schedule' }}
                    className="py-6"
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-6">
          {/* Message to students (broadcast) */}
          <motion.div variants={item}>
            <Card variant="raised">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <SectionHeader
                      title="Message to students"
                      subtitle="Shown on each client's dashboard."
                    />
                    <form onSubmit={handleBroadcastSubmit} className="mt-3 space-y-2">
                      <textarea
                        value={broadcastContent}
                        onChange={(e) => setBroadcastContent(e.target.value)}
                        rows={2}
                        maxLength={300}
                        className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                        placeholder="e.g. This week, focus on breathing and pacing during your rounds."
                      />
                      <ActionRow justify="between" className="mt-0">
                        <p className="text-[10px] text-[var(--cp-text-muted)]">
                          {broadcastContent.length}/300 characters
                        </p>
                        <Button type="submit" size="sm" disabled={broadcastSaving || !broadcastContent.trim()}>
                          {broadcastSaving ? 'Posting…' : 'Post to dashboards'}
                        </Button>
                      </ActionRow>
                      {broadcastError && (
                        <p className="text-xs text-[var(--cp-accent-danger)] mt-1">{broadcastError}</p>
                      )}
                    </form>
                  </div>
                  {lastBroadcast && (
                    <div className="w-full sm:w-64 border border-dashed border-[var(--cp-border-subtle)] rounded-xl p-3 text-xs text-[var(--cp-text-muted)] bg-[var(--cp-bg-surface)]">
                      <p className="font-medium text-[var(--cp-text-primary)] mb-1">Latest message</p>
                      <p className="whitespace-pre-wrap break-words">
                        {lastBroadcast.content}
                      </p>
                      {lastBroadcast.effective_at && (
                        <p className="mt-1 text-[10px]">
                          For {lastBroadcast.effective_at}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Messages to students – card list */}
          <motion.div variants={item}>
            <Card variant="raised">
              <CardContent className="p-5 sm:p-6">
                <SectionHeader title="Recent messages" className="mb-4" />
                {recentMessages.length > 0 ? (
                  <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      const byOther: Record<string, { name: string; snippet: string; date: string; created_at: string }> = {}
                      for (const m of recentMessages) {
                        const otherId = m.sender_id === currentUserId ? m.recipient_id : m.sender_id
                        const name = m.sender_id === currentUserId ? (m.recipient_name ?? 'Student') : (m.sender_name ?? 'Student')
                        const snippet = m.content.length > 60 ? `${m.content.slice(0, 60)}…` : m.content
                        const date = format(new Date(m.created_at), 'MMM d, h:mm a')
                        if (!byOther[otherId] || m.created_at > byOther[otherId].created_at) {
                          byOther[otherId] = { name, snippet, date, created_at: m.created_at }
                        }
                      }
                      const list = Object.entries(byOther)
                        .sort((a, b) => b[1].created_at.localeCompare(a[1].created_at))
                        .slice(0, 3)
                      return list.map(([otherId, { name, snippet, date }]) => (
                        <Link
                          key={otherId}
                          href="/coach/messages"
                          className="block rounded-xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-4 shadow-[var(--cp-shadow-soft)] hover:border-[var(--cp-accent-primary)]/50 hover:shadow-[var(--cp-shadow-card)] transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cp-accent-primary-soft)] text-sm font-semibold text-[var(--cp-accent-primary)]">
                              {(name || 'S').slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[var(--cp-text-primary)] truncate">{name}</p>
                              <p className="text-xs text-[var(--cp-text-muted)] mt-0.5 line-clamp-2">{snippet}</p>
                              <p className="text-[10px] text-[var(--cp-text-muted)] mt-1">{date}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs font-medium text-[var(--cp-accent-primary)]">View thread →</p>
                        </Link>
                      ))
                    })()}
                  </div>
                  {Object.keys((() => {
                    const byOther: Record<string, { created_at: string }> = {}
                    for (const m of recentMessages) {
                      const otherId = m.sender_id === currentUserId ? m.recipient_id : m.sender_id
                      if (!byOther[otherId] || m.created_at > byOther[otherId].created_at) {
                        byOther[otherId] = { created_at: m.created_at }
                      }
                    }
                    return byOther
                  })()).length > 3 && (
                    <ActionRow>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/coach/messages">View all messages →</Link>
                      </Button>
                    </ActionRow>
                  )}
                  </>
                ) : (
                  <EmptyState
                    title="No recent messages"
                    description="Conversations with students will appear here."
                    action={{ label: 'Open Messages', href: '/coach/messages' }}
                    className="py-6"
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
