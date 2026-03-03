import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/SidebarNav'
import { AppLayout } from '@/components/layout/AppLayout'
import { AnimatedPage } from '@/components/layout/AnimatedPage'

const coachNavItems = [
  { href: '/coach/dashboard', label: 'Dashboard' },
  { href: '/coach/clients', label: 'Clients' },
  { href: '/coach/schedule', label: 'Schedule' },
  { href: '/coach/session-packages', label: 'Session Packages' },
  { href: '/coach/programs', label: 'Programs' },
  { href: '/coach/videos', label: 'Videos' },
  { href: '/coach/payments', label: 'Payments' },
  { href: '/coach/messages', label: 'Messages' },
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    redirect('/client/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)]">
      <SidebarNav navItems={coachNavItems} />
      <AppLayout>
        <AnimatedPage>{children}</AnimatedPage>
      </AppLayout>
    </div>
  )
}

