import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { ClientScheduleContent } from './ClientScheduleContent'

export default async function ClientSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <ClientScheduleContent />
      </Suspense>
    )
  }

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('email', user.email)
    .single()

  if (!client) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <ClientScheduleContent />
      </Suspense>
    )
  }

  const [coachProfileRes, slotsRes, sessionsRes, requestsRes, timeRequestsRes] = await Promise.all([
    supabase.from('profiles').select('timezone').eq('id', client.coach_id).single(),
    supabase
      .from('availability_slots')
      .select('*, session_products(name, price_cents)')
      .eq('coach_id', client.coach_id)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true }),
    supabase
      .from('sessions')
      .select('*')
      .eq('client_id', client.id)
      .order('scheduled_time', { ascending: true }),
    supabase
      .from('session_requests')
      .select('*, session_products(name, duration_minutes)')
      .eq('client_id', client.id)
      .in('status', ['offered', 'accepted', 'payment_pending', 'paid', 'availability_submitted', 'scheduled'])
      .order('created_at', { ascending: false }),
    supabase
      .from('client_time_requests')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false }),
  ])

  const initialData = {
    client,
    coachTimezone: coachProfileRes.data?.timezone ?? null,
    slots: slotsRes.data ?? [],
    sessions: sessionsRes.data ?? [],
    sessionRequests: requestsRes.data ?? [],
    timeRequests: timeRequestsRes.data ?? [],
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClientScheduleContent initialData={initialData} />
    </Suspense>
  )
}
