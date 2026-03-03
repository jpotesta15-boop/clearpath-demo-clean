import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, startOfWeek } from 'date-fns'
import { DashboardContent } from './DashboardContent'
import { getClientId } from '@/lib/config'

export default async function CoachDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('coach_id', user!.id)

  const { data: upcomingSessions } = await supabase
    .from('sessions')
    .select('*, clients(*)')
    .eq('coach_id', user!.id)
    .eq('status', 'confirmed')
    .gte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true })
    .limit(10)

  const { data: pendingSessions } = await supabase
    .from('sessions')
    .select('*, clients(*)')
    .eq('coach_id', user!.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  const { count: unseenMessagesCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user!.id)
    .is('read_at', null)

  const { data: nextSessionRow } = await supabase
    .from('sessions')
    .select('*, clients(*)')
    .eq('coach_id', user!.id)
    .eq('status', 'confirmed')
    .gte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true })
    .limit(1)
    .maybeSingle()

  const { count: completedCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', user!.id)
    .eq('status', 'completed')
    .gte('scheduled_time', monthStart)
    .lte('scheduled_time', monthEnd)

  const { count: canceledCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', user!.id)
    .eq('status', 'cancelled')
    .gte('scheduled_time', monthStart)
    .lte('scheduled_time', monthEnd)

  const tenantId = getClientId()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()

  const { data: coachProfile } = await supabase
    .from('profiles')
    .select('stripe_connect_account_id')
    .eq('id', user!.id)
    .single()

  const { data: revenueRows } = await supabase
    .from('payments')
    .select('amount_cents, created_at')
    .eq('coach_id', user!.id)
    .eq('client_id', tenantId)
    .in('status', ['succeeded', 'recorded_manual'])

  const revenueCents = (revenueRows ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0)
  const revenueThisWeekCents = (revenueRows ?? []).filter((r) => r.created_at >= weekStart).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0)
  const revenue = revenueCents / 100
  const revenueThisWeek = revenueThisWeekCents / 100

  return (
    <DashboardContent
      stripeConnectAccountId={coachProfile?.stripe_connect_account_id ?? null}
      totalClients={clients?.length ?? 0}
      upcomingCount={upcomingSessions?.length ?? 0}
      pendingCount={pendingSessions?.length ?? 0}
      revenue={revenue}
      revenueThisWeek={revenueThisWeek}
      unseenMessagesCount={unseenMessagesCount ?? 0}
      nextSession={nextSessionRow ?? null}
      upcomingSessions={upcomingSessions ?? []}
      pendingSessions={pendingSessions ?? []}
      completedCount={completedCount ?? 0}
      canceledCount={canceledCount ?? 0}
    />
  )
}

