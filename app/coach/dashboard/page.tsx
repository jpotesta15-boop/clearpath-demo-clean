import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, startOfWeek, subWeeks, format } from 'date-fns'
import { getClientId } from '@/lib/config'
import { dismissOnboardingChecklist } from './actions'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

const DashboardContent = dynamic(() => import('./DashboardContent').then((m) => ({ default: m.DashboardContent })), {
  loading: () => <PageSkeleton />,
})

export default async function CoachDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()
  const tenantId = getClientId()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()

  const [
    clientsRes,
    upcomingSessionsRes,
    pendingSessionsRes,
    unseenMessagesRes,
    nextSessionRowRes,
    completedCountRes,
    canceledCountRes,
    coachProfileRes,
    availabilitySlotsCountRes,
    sessionProductsCountRes,
    revenueRowsRes,
    availabilityRequestsRes,
    recentMessagesRowsRes,
    latestDailyMessagesRes,
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('coach_id', user!.id),
    supabase
      .from('sessions')
      .select('*, clients(*)')
      .eq('coach_id', user!.id)
      .eq('status', 'confirmed')
      .gte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(10),
    supabase
      .from('sessions')
      .select('*, clients(*)')
      .eq('coach_id', user!.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('recipient_id', user!.id).is('read_at', null),
    supabase
      .from('sessions')
      .select('*, clients(*)')
      .eq('coach_id', user!.id)
      .eq('status', 'confirmed')
      .gte('scheduled_time', new Date().toISOString())
      .order('scheduled_time', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', user!.id)
      .eq('status', 'completed')
      .gte('scheduled_time', monthStart)
      .lte('scheduled_time', monthEnd),
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', user!.id)
      .eq('status', 'cancelled')
      .gte('scheduled_time', monthStart)
      .lte('scheduled_time', monthEnd),
    supabase.from('profiles').select('stripe_connect_account_id, tagline, preferences').eq('id', user!.id).single(),
    supabase.from('availability_slots').select('*', { count: 'exact', head: true }).eq('coach_id', user!.id),
    supabase.from('session_products').select('*', { count: 'exact', head: true }).eq('coach_id', user!.id),
    supabase
      .from('payments')
      .select('amount_cents, created_at')
      .eq('coach_id', user!.id)
      .eq('client_id', tenantId)
      .in('status', ['succeeded', 'recorded_manual']),
    supabase
      .from('session_requests')
      .select('id, clients(full_name), session_products(name)')
      .eq('coach_id', user!.id)
      .eq('status', 'availability_submitted')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('messages')
      .select('id, sender_id, recipient_id, content, created_at')
      .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('coach_daily_messages')
      .select('content, effective_at, created_at')
      .eq('coach_id', user!.id)
      .eq('client_id', tenantId)
      .order('effective_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const clients = clientsRes.data
  const upcomingSessions = upcomingSessionsRes.data
  const pendingSessions = pendingSessionsRes.data
  const unseenMessagesCount = unseenMessagesRes.count
  const nextSessionRow = nextSessionRowRes.data
  const completedCount = completedCountRes.count
  const canceledCount = canceledCountRes.count
  const coachProfile = coachProfileRes.data
  const availabilitySlotsCount = availabilitySlotsCountRes.count
  const sessionProductsCount = sessionProductsCountRes.count
  const revenueRows = revenueRowsRes.data
  const availabilityRequests = availabilityRequestsRes.data
  const recentMessagesRows = recentMessagesRowsRes.data
  const latestDailyMessages = latestDailyMessagesRes.data

  const preferences = (coachProfile?.preferences as Record<string, unknown>) ?? {}
  const onboardingDismissed = preferences.onboarding_checklist_dismissed === true

  const hasClients = (clients?.length ?? 0) > 0
  const hasAvailability = (availabilitySlotsCount ?? 0) > 0
  const hasSessionPackage = (sessionProductsCount ?? 0) > 0

  const revenueCents = (revenueRows ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0)
  const revenueThisWeekCents = (revenueRows ?? []).filter((r) => r.created_at >= weekStart).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0)
  const revenue = revenueCents / 100
  const revenueThisWeek = revenueThisWeekCents / 100

  const weeksBack = 8
  const revenueByWeek: { weekLabel: string; revenue: number; weekStart: string }[] = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const ws = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const weekStartIso = ws.toISOString()
    const weekEndIso = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const label = format(ws, 'MMM d')
    const revCents = (revenueRows ?? []).filter((r) => r.created_at && r.created_at >= weekStartIso && r.created_at < weekEndIso).reduce((s, r) => s + (r.amount_cents ?? 0), 0)
    revenueByWeek.push({ weekLabel: label, revenue: revCents / 100, weekStart: weekStartIso })
  }

  const recentMessageIds = [...new Set((recentMessagesRows ?? []).flatMap((m) => [m.sender_id, m.recipient_id]))]
  const { data: recentMessageProfiles } = recentMessageIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', recentMessageIds)
    : { data: [] as { id: string; full_name: string | null }[] }

  const recentMessages = (recentMessagesRows ?? []).map((m) => ({
    ...m,
    sender_name: recentMessageProfiles?.find((p) => p.id === m.sender_id)?.full_name ?? null,
    recipient_name: recentMessageProfiles?.find((p) => p.id === m.recipient_id)?.full_name ?? null,
  }))

  const currentTime = format(now, 'h:mm a · EEEE, MMMM d')
  const latestDailyMessage = latestDailyMessages && latestDailyMessages.length > 0 ? latestDailyMessages[0] : null

  return (
    <DashboardContent
      tagline={coachProfile?.tagline ?? null}
      stripeConnectAccountId={coachProfile?.stripe_connect_account_id ?? null}
      totalClients={clients?.length ?? 0}
      upcomingCount={upcomingSessions?.length ?? 0}
      pendingCount={pendingSessions?.length ?? 0}
      revenue={revenue}
      revenueThisWeek={revenueThisWeek}
      unseenMessagesCount={unseenMessagesCount ?? 0}
      initialDailyMessage={latestDailyMessage}
      nextSession={nextSessionRow ?? null}
      upcomingSessions={upcomingSessions ?? []}
      pendingSessions={pendingSessions ?? []}
      completedCount={completedCount ?? 0}
      canceledCount={canceledCount ?? 0}
      currentTime={currentTime}
      revenueByWeek={revenueByWeek}
      availabilityRequests={availabilityRequests ?? []}
      clients={clients ?? []}
      recentMessages={recentMessages ?? []}
      currentUserId={user!.id}
      onboardingDismissed={onboardingDismissed}
      hasClients={hasClients}
      hasAvailability={hasAvailability}
      hasSessionPackage={hasSessionPackage}
      onDismissOnboarding={dismissOnboardingChecklist}
    />
  )
}

