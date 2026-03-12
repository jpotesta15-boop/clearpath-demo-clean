import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, subMonths, format } from 'date-fns'
import { getClientId } from '@/lib/config'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

const AnalyticsContent = dynamic(() => import('./AnalyticsContent').then((m) => ({ default: m.AnalyticsContent })), {
  loading: () => <PageSkeleton />,
})

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = getClientId()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('coach_id', user!.id)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, client_id, scheduled_time, amount_cents, status')
    .eq('coach_id', user!.id)
    .in('status', ['completed', 'confirmed'])

  const { data: payments } = await supabase
    .from('payments')
    .select('amount_cents, created_at')
    .eq('coach_id', user!.id)
    .eq('client_id', tenantId)
    .in('status', ['succeeded', 'recorded_manual'])

  const now = new Date()
  const monthsBack = 12
  const monthlyRevenue: { monthLabel: string; revenue: number; monthStart: string }[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i))
    const end = startOfMonth(subMonths(now, i - 1))
    const startIso = start.toISOString()
    const revCents = (payments ?? []).filter(
      (p) => p.created_at && p.created_at >= startIso && p.created_at < end.toISOString()
    ).reduce((s, p) => s + (p.amount_cents ?? 0), 0)
    monthlyRevenue.push({
      monthLabel: format(start, 'MMM yyyy'),
      revenue: revCents / 100,
      monthStart: startIso,
    })
  }

  const totalRevenueCents = (payments ?? []).reduce((s, p) => s + (p.amount_cents ?? 0), 0)
  const totalRevenue = totalRevenueCents / 100

  const clientStats = (clients ?? []).map((c) => {
    const clientSessions = (sessions ?? []).filter((s) => s.client_id === c.id)
    const count = clientSessions.length
    const lastSession = clientSessions.length > 0
      ? clientSessions.reduce((latest, s) => {
          const t = new Date(s.scheduled_time).getTime()
          return t > new Date(latest.scheduled_time).getTime() ? s : latest
        }, clientSessions[0])
      : null
    const spentCents = clientSessions.reduce((s, sess) => s + (sess.amount_cents ?? 0), 0)
    return {
      clientId: c.id,
      clientName: c.full_name ?? 'Unnamed',
      sessionsAttended: count,
      lastSessionDate: lastSession?.scheduled_time ?? null,
      totalSpent: spentCents / 100,
    }
  })

  return (
    <AnalyticsContent
      monthlyRevenue={monthlyRevenue}
      totalRevenue={totalRevenue}
      clientStats={clientStats}
    />
  )
}
