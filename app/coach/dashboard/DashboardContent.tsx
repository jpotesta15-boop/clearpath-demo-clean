'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, addDays, startOfDay, isSameDay } from 'date-fns'

type Session = {
  id: string
  scheduled_time: string
  clients?: { full_name?: string } | null
}

type DashboardContentProps = {
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
              hasSession ? 'bg-blue-100 font-medium text-blue-800' : 'bg-gray-100 text-gray-600'
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
}: DashboardContentProps) {
  const [expandedPanel, setExpandedPanel] = useState<PanelId | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Your coaching at a glance — tap any tile for details.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-50 p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium text-slate-50">Accept session payments</h3>
            <p className="text-sm text-slate-200/80">
              {stripeConnectAccountId
                ? 'Your Stripe account is connected. Clients can pay for session offers.'
                : 'Connect Stripe to accept payments when clients book sessions.'}
            </p>
          </div>
          <div>
            {stripeConnectAccountId ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                  Stripe connected
                </span>
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  disabled={connectLoading}
                  className="text-sm font-medium text-sky-300 hover:text-sky-200 disabled:opacity-50"
                >
                  {connectLoading ? 'Opening…' : 'Reconnect'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectStripe}
                disabled={connectLoading}
                className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
              >
                {connectLoading ? 'Opening…' : 'Connect Stripe'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {tiles.map(({ id, label, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setExpandedPanel(id)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-400 hover:bg-sky-50/70 hover:shadow-md transition-all min-h-[120px]"
          >
            <span className="text-slate-600">{iconSvg[id]}</span>
            <span className="text-sm font-medium text-slate-800 text-center">{label}</span>
            {badge != null && badge > 0 && (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {expandedPanel && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 overflow-y-auto"
          aria-modal="true"
          role="dialog"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 py-3 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-50">
              {tiles.find((t) => t.id === expandedPanel)?.label ?? expandedPanel}
            </h2>
            <button
              type="button"
              onClick={() => setExpandedPanel(null)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
            >
              Close
            </button>
          </div>
          <div className="p-6 max-w-2xl mx-auto text-slate-100">
            {expandedPanel === 'revenue' && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-slate-300">Total revenue</p>
                  <p className="text-3xl font-bold text-slate-50">${revenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Revenue this week</p>
                  <p className="text-2xl font-semibold text-slate-50">${revenueThisWeek.toLocaleString()}</p>
                </div>
              </div>
            )}

            {expandedPanel === 'clients' && (
              <div className="space-y-4">
                <p className="text-2xl font-bold text-slate-50">{totalClients} clients</p>
                <Link
                  href="/coach/clients"
                  className="inline-flex font-medium text-blue-600 hover:text-blue-800"
                >
                  View all clients →
                </Link>
              </div>
            )}

            {expandedPanel === 'upcoming' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">{upcomingCount} upcoming sessions</p>
                {upcomingSessions.length > 0 ? (
                  <ul className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <li key={session.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <p className="font-medium text-slate-50">{session.clients?.full_name ?? 'Client'}</p>
                    <p className="text-sm text-slate-300">
                          {format(new Date(session.scheduled_time), 'EEEE, MMM d, yyyy · h:mm a')}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400">No upcoming sessions</p>
                )}
                <Link
                  href="/coach/schedule"
                  className="inline-flex font-medium text-blue-600 hover:text-blue-800"
                >
                  Open schedule →
                </Link>
              </div>
            )}

            {expandedPanel === 'pending' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{pendingSessions.length} pending confirmation(s)</p>
                {pendingSessions.length > 0 ? (
                  <ul className="space-y-3">
                    {pendingSessions.map((session) => (
                      <li key={session.id} className="border-b border-gray-100 pb-3 last:border-0">
                        <p className="font-medium text-gray-900">{session.clients?.full_name ?? 'Client'}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(session.scheduled_time), 'MMM d, yyyy h:mm a')}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No pending requests</p>
                )}
                <Link
                  href="/coach/schedule"
                  className="inline-flex font-medium text-blue-600 hover:text-blue-800"
                >
                  Open schedule →
                </Link>
              </div>
            )}

            {expandedPanel === 'messages' && (
              <div className="space-y-4">
                <p className="text-2xl font-bold text-gray-900">
                  {unseenMessagesCount} unread message{unseenMessagesCount === 1 ? '' : 's'}
                </p>
                <Link
                  href="/coach/messages"
                  className="inline-flex font-medium text-blue-600 hover:text-blue-800"
                >
                  Go to Messages →
                </Link>
              </div>
            )}

            {expandedPanel === 'week' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Completed (this month)</p>
                  <p className="text-lg font-semibold text-gray-900">{completedCount}</p>
                  <p className="text-sm text-gray-500">Canceled (this month)</p>
                  <p className="text-lg font-semibold text-gray-900">{canceledCount}</p>
                </div>
                {nextSession ? (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-500">Next session</p>
                    <p className="font-semibold text-gray-900">{nextSession.clients?.full_name ?? 'Client'}</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(nextSession.scheduled_time), 'EEEE, MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No upcoming sessions</p>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">This week</p>
                  <WeekMiniCalendar upcomingSessions={upcomingSessions} />
                </div>
                <Link
                  href="/coach/schedule"
                  className="inline-flex font-medium text-blue-600 hover:text-blue-800"
                >
                  Open schedule →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
