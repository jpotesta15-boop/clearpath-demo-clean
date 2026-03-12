import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav, { NavItem } from '@/components/SidebarNav'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { CoachHeader } from '@/components/layout/CoachHeader'
import { AppLayout } from '@/components/layout/AppLayout'
import { AnimatedPageWithExit } from '@/components/layout/AnimatedPage'
import { ClientBrandWrapper } from '@/components/providers/ClientBrandWrapper'
import { getClientId } from '@/lib/config'
import { getCoachBrand } from '@/lib/brand-resolver'
import { startOfWeek } from 'date-fns'

const baseCoachNavItems: NavItem[] = [
  { href: '/coach/dashboard', label: 'Home' },
  { href: '/coach/schedule', label: 'Schedule' },
  { href: '/coach/clients', label: 'Clients' },
  { href: '/coach/messages', label: 'Messages' },
  { href: '/coach/programs', label: 'Programs' },
  { href: '/coach/videos', label: 'Videos' },
  { href: '/coach/session-packages', label: 'Session Packages' },
  { href: '/coach/payments', label: 'Payments' },
  { href: '/coach/analytics', label: 'Analytics' },
  { href: '/coach/settings', label: 'Settings' },
]

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = getClientId()
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()

  const [profileRes, recentPaymentsRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', user.id)
      .eq('client_id', tenantId)
      .eq('status', 'succeeded')
      .gte('created_at', weekStart),
  ])

  const profile = profileRes.data
  if (profile?.role !== 'coach') {
    redirect('/client/dashboard')
  }

  const recentPaymentsCount = recentPaymentsRes.count

  const coachNavItems: NavItem[] = baseCoachNavItems.map((item) => {
    if (item.href === '/coach/payments') {
      return { ...item, badgeCount: recentPaymentsCount ?? 0 }
    }
    return item
  })

  const brand = await getCoachBrand(supabase, user.id)

  return (
    <ClientBrandWrapper brand={brand}>
      <div className="flex min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)]">
        <SidebarNav navItems={coachNavItems} />
        <div className="flex-1 flex flex-col min-w-0">
          <CoachHeader />
          <AppLayout>
            <AnimatedPageWithExit>{children}</AnimatedPageWithExit>
          </AppLayout>
        </div>
        <MobileBottomNav navItems={coachNavItems} />
      </div>
    </ClientBrandWrapper>
  )
}

