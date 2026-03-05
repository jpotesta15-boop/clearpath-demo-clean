'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay, isSameDay } from 'date-fns'
import { motion, animate } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

function useRevenueCountUp(revenue: number, duration = 1.2) {
  const [displayValue, setDisplayValue] = useState(0)
  useEffect(() => {
    const controls = animate(0, revenue, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayValue(v),
    })
    return () => controls.stop()
  }, [revenue, duration])
  return displayValue
}

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

type PanelId =
  | 'revenue'
  | 'clients'
  | 'upcoming'
  | 'pending'
  | 'messages'
  | 'week'

function WeekMiniCalendar({ upcomingSessions }: { upcomingSessions: Session[] }) {
  const today = startOfDay(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  return (
    <div className="grid grid-cols-7 gap-2 text-center max-w-md">
      {days.map((day) => {
        const hasSession = upcomingSessions.some((s) =>
          isSameDay(new Date(s.scheduled_time), day)
        )
        return (
          <div
            key={day.toISOString()}
            className={`rounded-lg p-3 text-sm ${
              hasSession
                ? 'bg-[var(--cp-accent-primary-soft)] font-medium text-[var(--cp-accent-primary)]'
                : 'bg-[var(--cp-bg-subtle)] text-[var(--cp-text-muted)]'
            }`}
          >
            <div>{format(day, 'EEE')}</div>
            <div className="text-lg font-semibold">{format(day, 'd')}</div>
          </div>
        )
      })}
    </div>
  )
}

const iconSvg = {
  revenue: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  clients: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  upcoming: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  pending: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  messages: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  week: (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
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
  const [expandedPanel, setExpandedPanel] = useState<PanelId | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [dismissingOnboarding, setDismissingOnboarding] = useState(false)
  const [currentTime, setCurrentTime] = useState(initialCurrentTime)

  useEffect(() => {
    const tick = () => setCurrentTime(format(new Date(), 'h:mm a · EEEE, MMMM d'))
    const id = setInterval(tick, 60 * 1000)
    return () => clearInterval(id)
  }, [])

  async function handleConnectStripe() {
    setConnectLoading(true)
    try {
      const res = await fetch('/api/stripe/connect/account-link', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error ?? 'Failed to start Stripe Connect')
        return
      }
      if (data.url) window.location.href = data.url
    } finally {
      setConnectLoading(false)
    }
  }

  const tiles: { id: PanelId; label: string; badge?: number }[] = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'clients', label: 'Clients', badge: totalClients },
    { id: 'upcoming', label: 'Upcoming Sessions', badge: upcomingCount },
    { id: 'pending', label: 'Pending', badge: pendingCount },
    { id: 'messages', label: 'Messages', badge: unseenMessagesCount },
    { id: 'week', label: 'This Week' },
  ]

  const revenueDisplay = useRevenueCountUp(revenue)
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
  const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

  return (
    <div className="max-w-6xl mx-auto space-y-10 px-4 sm:px-6">
      <motion.div initial="hidden" animate="show" variants={container}>
        <div className="flex flex-col gap-3 mb-2">
          <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Welcome back</h1>
          <p className="text-sm text-[var(--cp-text-muted)]">
            {tagline?.trim() ?? 'Your coaching at a glance — tap any tile for details.'}
          </p>
        </div>

        {!onboardingDismissed && (
          <motion.div
            variants={item}
            className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-5 sm:p-6 shadow-[var(--cp-shadow-card)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="font-medium text-[var(--cp-text-primary)]">Get started</h3>
              <button
                type="button"
                onClick={async () => {
                  setDismissingOnboarding(true)
                  await onDismissOnboarding()
                  setDismissingOnboarding(false)
                }}
                disabled={dismissingOnboarding}
                className="text-sm text-[var(--cp-text-muted)] hover:text-[var(--cp-text-primary)] disabled:opacity-50"
              >
                {dismissingOnboarding ? 'Dismissing…' : 'Dismiss'}
              </button>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                {hasClients ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]" aria-hidden>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </span>
                ) : (
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--cp-border-subtle)] text-[var(--cp-text-muted)]" aria-hidden>1</span>
                )}
                <Link
                  href="/coach/clients/new"
                  className={hasClients ? 'text-[var(--cp-text-muted)]' : 'font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]'}
                >
                  Add your first client
                </Link>
              </li>
              <li className="flex items-center gap-3">
                {hasAvailability ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]" aria-hidden>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </span>
                ) : (
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--cp-border-subtle)] text-[var(--cp-text-muted)]" aria-hidden>2</span>
                )}
                <Link
                  href="/coach/schedule"
                  className={hasAvailability ? 'text-[var(--cp-text-muted)]' : 'font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]'}
                >
                  Set your availability
                </Link>
              </li>
              <li className="flex items-center gap-3">
                {hasSessionPackage ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]" aria-hidden>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </span>
                ) : (
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--cp-border-subtle)] text-[var(--cp-text-muted)]" aria-hidden>3</span>
                )}
                <Link
                  href="/coach/session-packages"
                  className={hasSessionPackage ? 'text-[var(--cp-text-muted)]' : 'font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]'}
                >
                  Create a session package
                </Link>
              </li>
            </ul>
          </motion.div>
        )}

        {/* Revenue hero: chart at top with count-up summary */}
        <motion.div
          variants={item}
          className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-6 shadow-[var(--cp-shadow-card)]"
        >
          <div className="flex flex-wrap items-baseline gap-6 gap-y-2 mb-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--cp-text-muted)] mb-0.5">Total revenue</h3>
              <p className="text-3xl font-bold tabular-nums text-[var(--cp-text-primary)]">
                ${Math.round(revenueDisplay).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--cp-text-muted)] mb-0.5">This week</h3>
              <p className="text-xl font-semibold tabular-nums text-[var(--cp-text-primary)]">
                ${revenueThisWeek.toLocaleString()}
              </p>
            </div>
          </div>
          <h3 className="text-sm font-medium text-[var(--cp-text-muted)] mb-2">Revenue by week</h3>
          <div className="h-[240px] w-full min-h-[200px]">
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
        </motion.div>

      <motion.div variants={item} className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] text-[var(--cp-text-primary)] p-5 sm:p-6 shadow-[var(--cp-shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-medium text-[var(--cp-text-primary)]">Accept session payments</h3>
            <p className="text-sm text-[var(--cp-text-muted)] mt-0.5">
              {stripeConnectAccountId
                ? 'Your Stripe account is connected. Clients can pay for session offers.'
                : 'Connect Stripe to accept payments when clients book sessions.'}
            </p>
          </div>
          <div className="shrink-0">
            {stripeConnectAccountId ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[var(--cp-accent-success)]/20 px-3 py-1 text-sm font-medium text-[var(--cp-accent-success)]">
                  Stripe connected
                </span>
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={connectLoading}
                  className="text-sm font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)] disabled:opacity-50"
                >
                  {connectLoading ? 'Opening…' : 'Reconnect'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectStripe}
                disabled={connectLoading}
                className="inline-flex items-center rounded-lg bg-[var(--cp-accent-primary)] px-4 py-2 text-sm font-medium text-[var(--cp-text-on-accent)] hover:opacity-90 disabled:opacity-50"
              >
                {connectLoading ? 'Opening…' : 'Connect Stripe'}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Link
          href="/coach/analytics"
          className="block rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-5 sm:p-6 shadow-[var(--cp-shadow-soft)] hover:border-[var(--cp-accent-primary)]/50 transition-colors"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-medium text-[var(--cp-text-primary)]">Revenue & activity</h3>
              <p className="text-sm text-[var(--cp-text-muted)] mt-0.5">
                View analytics: monthly revenue, client sessions, and spending.
              </p>
            </div>
            <span className="text-[var(--cp-accent-primary)] font-medium text-sm shrink-0">View analytics →</span>
          </div>
        </Link>
      </motion.div>

      <motion.div variants={item} className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-5 sm:p-6 shadow-[var(--cp-shadow-soft)]">
        <h3 className="text-sm font-medium text-[var(--cp-text-muted)] mb-3">Next up</h3>
        {upcomingSessions.length > 0 ? (
          <ul className="space-y-3">
            {upcomingSessions.slice(0, 2).map((session) => (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[var(--cp-border-subtle)] last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--cp-text-primary)]">{session.clients?.full_name ?? 'Client'}</p>
                  <p className="text-sm text-[var(--cp-text-muted)]">
                    {format(new Date(session.scheduled_time), 'EEE, MMM d · h:mm a')}
                  </p>
                </div>
                <Link
                  href="/coach/schedule"
                  className="text-sm font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)] shrink-0"
                >
                  View schedule →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-2">
            <p className="text-[var(--cp-text-muted)]">Nothing scheduled next — your week is open.</p>
            <Link
              href="/coach/schedule"
              className="mt-2 inline-flex font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
            >
              Schedule a session →
            </Link>
          </div>
        )}
      </motion.div>

      <motion.div variants={item} className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-5 sm:p-6 shadow-[var(--cp-shadow-soft)]">
        <h3 className="text-sm font-medium text-[var(--cp-text-muted)] mb-3">Ready to schedule</h3>
        <p className="text-sm text-[var(--cp-text-muted)] mb-3">Clients have submitted their availability. Confirm a time on Schedule to book.</p>
        {availabilityRequests.length > 0 ? (
          <ul className="space-y-3">
            {availabilityRequests.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[var(--cp-border-subtle)] last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--cp-text-primary)]">
                    {req.clients?.[0]?.full_name ?? 'Client'}
                  </p>
                  <p className="text-sm text-[var(--cp-text-muted)]">
                    {req.session_products?.[0]?.name ?? 'Session'} — waiting for you to pick a time
                  </p>
                </div>
                <Link
                  href="/coach/schedule"
                  className="text-sm font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)] shrink-0"
                >
                  Confirm & book →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--cp-text-muted)] py-1">No availability requests right now.</p>
        )}
        <Link
          href="/coach/schedule"
          className="mt-3 inline-block text-sm font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
        >
          Open Schedule →
        </Link>
      </motion.div>
      </motion.div>

      <motion.div initial="hidden" animate="show" variants={container} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {tiles.map(({ id, label, badge }) => (
          <motion.button
            key={id}
            variants={item}
            type="button"
            onClick={() => setExpandedPanel(id)}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] p-6 shadow-[var(--cp-shadow-soft)] hover:border-[var(--cp-accent-primary)] hover:bg-[var(--cp-accent-primary-soft)] hover:shadow-[var(--cp-shadow-card)] transition-all min-h-[140px] sm:min-h-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
          >
            <span className="text-[var(--cp-text-muted)]">{iconSvg[id]}</span>
            <span className="text-sm font-medium text-[var(--cp-text-primary)] text-center">{label}</span>
            {badge != null && badge > 0 && (
              <span className="rounded-full bg-[var(--cp-accent-primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--cp-accent-primary)]">
                {badge}
              </span>
            )}
          </motion.button>
        ))}
      </motion.div>

      {expandedPanel && (
        <div
          className="fixed inset-0 z-50 bg-[var(--cp-bg-backdrop)] overflow-y-auto"
          aria-modal="true"
          role="dialog"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] px-4 py-3 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--cp-text-primary)]">
              {tiles.find((t) => t.id === expandedPanel)?.label ?? expandedPanel}
            </h2>
            <button
              type="button"
              onClick={() => setExpandedPanel(null)}
              className="rounded-lg border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-4 py-2 text-sm font-medium text-[var(--cp-text-primary)] hover:bg-[var(--cp-bg-subtle)]"
            >
              Close
            </button>
          </div>
          <div className="p-6 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] shadow-[var(--cp-shadow-card)] p-6 text-[var(--cp-text-primary)]">
            {expandedPanel === 'revenue' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--cp-text-muted)]">Total revenue</p>
                    <p className="text-3xl font-bold text-[var(--cp-text-primary)]">${revenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--cp-text-muted)]">Revenue this week</p>
                    <p className="text-2xl font-semibold text-[var(--cp-text-primary)]">${revenueThisWeek.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-[280px] w-full">
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
              </div>
            )}

            {expandedPanel === 'clients' && (
              <div className="space-y-4">
                {clients.length > 0 ? (
                  <>
                    <p className="text-lg font-semibold text-[var(--cp-text-primary)]">{clients.length} clients</p>
                    <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                      {clients.map((c) => (
                        <li key={c.id} className="border-b border-[var(--cp-border-subtle)] pb-2 last:border-0">
                          <Link
                            href={`/coach/clients/${c.id}`}
                            className="font-medium text-[var(--cp-text-primary)] hover:text-[var(--cp-accent-primary)]"
                          >
                            {c.full_name ?? 'Unnamed client'}
                          </Link>
                          {c.email && (
                            <p className="text-sm text-[var(--cp-text-muted)] truncate">{c.email}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/coach/clients"
                      className="inline-flex font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
                    >
                      View all clients →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-[var(--cp-text-muted)]">You don't have any clients yet. Add your first client to start booking sessions.</p>
                    <Link
                      href="/coach/clients/new"
                      className="inline-flex font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
                    >
                      Add your first client →
                    </Link>
                  </>
                )}
              </div>
            )}

            {expandedPanel === 'upcoming' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--cp-text-muted)]">{upcomingCount} upcoming sessions</p>
                {upcomingSessions.length > 0 ? (
                  <ul className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <li key={session.id} className="border-b border-[var(--cp-border-subtle)] pb-3 last:border-0">
                    <p className="font-medium text-[var(--cp-text-primary)]">{session.clients?.full_name ?? 'Client'}</p>
                    <p className="text-sm text-[var(--cp-text-muted)]">
                          {format(new Date(session.scheduled_time), 'EEEE, MMM d, yyyy · h:mm a')}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[var(--cp-text-muted)]">No upcoming sessions</p>
                )}
                <Link
                  href="/coach/schedule"
                  className="inline-flex font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
                >
                  Open schedule →
                </Link>
              </div>
            )}

            {expandedPanel === 'pending' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--cp-text-muted)]">{pendingSessions.length} pending confirmation(s)</p>
                {pendingSessions.length > 0 ? (
                  <ul className="space-y-3">
                    {pendingSessions.map((session) => (
                      <li key={session.id} className="border-b border-[var(--cp-border-subtle)] pb-3 last:border-0">
                        <p className="font-medium text-[var(--cp-text-primary)]">{session.clients?.full_name ?? 'Client'}</p>
                        <p className="text-sm text-[var(--cp-text-muted)]">
                          {format(new Date(session.scheduled_time), 'MMM d, yyyy h:mm a')}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p className="text-[var(--cp-text-muted)]">No session requests waiting. New requests from clients will show up here.</p>
                    <Link
                      href="/coach/schedule"
                      className="inline-flex font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
                    >
                      Open schedule →
                    </Link>
                  </>
                )}
                {pendingSessions.length > 0 && (
                  <Link
                    href="/coach/schedule"
                    className="inline-flex font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
                  >
                    Open schedule →
                  </Link>
                )}
              </div>
            )}

            {expandedPanel === 'messages' && (
              <div className="space-y-4">
                {unseenMessagesCount > 0 && (
                  <p className="text-sm font-medium text-[var(--cp-text-primary)]">
                    {unseenMessagesCount} unread message{unseenMessagesCount === 1 ? '' : 's'}
                  </p>
                )}
                {recentMessages.length > 0 ? (
                  <>
                    <ul className="space-y-3 max-h-[40vh] overflow-y-auto">
                      {recentMessages.map((m) => {
                        const fromCoach = m.sender_id === currentUserId
                        const otherName = fromCoach ? (m.recipient_name ?? 'Client') : (m.sender_name ?? 'Client')
                        const label = fromCoach ? `You → ${otherName}` : `${otherName} → you`
                        const snippet = m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content
                        return (
                          <li key={m.id} className="border-b border-[var(--cp-border-subtle)] pb-2 last:border-0">
                            <p className="text-xs text-[var(--cp-text-muted)]">{label} · {format(new Date(m.created_at), 'MMM d, h:mm a')}</p>
                            <p className="text-sm text-[var(--cp-text-primary)] mt-0.5">{snippet}</p>
                          </li>
                        )
                      })}
                    </ul>
                    <Link
                      href="/coach/messages"
                      className="inline-flex font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
                    >
                      Go to Messages →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-[var(--cp-text-muted)]">No recent messages.</p>
                    <Link
                      href="/coach/messages"
                      className="inline-flex font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
                    >
                      Open Messages →
                    </Link>
                  </>
                )}
              </div>
            )}

            {expandedPanel === 'week' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--cp-border-subtle)] p-4">
                  <p className="text-sm text-[var(--cp-text-muted)]">Completed (this month)</p>
                  <p className="text-lg font-semibold text-[var(--cp-text-primary)]">{completedCount}</p>
                  <p className="text-sm text-[var(--cp-text-muted)]">Canceled (this month)</p>
                  <p className="text-lg font-semibold text-[var(--cp-text-primary)]">{canceledCount}</p>
                </div>
                {nextSession ? (
                  <div className="rounded-lg border border-[var(--cp-border-subtle)] p-4">
                    <p className="text-sm font-medium text-[var(--cp-text-muted)]">Next session</p>
                    <p className="font-semibold text-[var(--cp-text-primary)]">{nextSession.clients?.full_name ?? 'Client'}</p>
                    <p className="text-sm text-[var(--cp-text-muted)]">
                      {format(new Date(nextSession.scheduled_time), 'EEEE, MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                ) : (
                  <p className="text-[var(--cp-text-muted)]">No upcoming sessions this week. Schedule one when you're ready.</p>
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--cp-text-muted)] mb-3">This week</p>
                  <WeekMiniCalendar upcomingSessions={upcomingSessions} />
                </div>
                <Link
                  href="/coach/schedule"
                  className="inline-flex font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
                >
                  Open schedule →
                </Link>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
