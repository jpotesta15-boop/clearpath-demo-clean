import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientId } from '@/lib/config'
import SidebarNav, { NavItem } from '@/components/SidebarNav'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { AppLayout } from '@/components/layout/AppLayout'
import { AnimatedPageWithExit } from '@/components/layout/AnimatedPage'

const clientNavItems: NavItem[] = [
  { href: '/client/dashboard', label: 'Home' },
  { href: '/client/programs', label: 'Programs' },
  { href: '/client/schedule', label: 'Schedule' },
  { href: '/client/videos', label: 'Videos' },
  { href: '/client/messages', label: 'Messages' },
  { href: '/client/settings', label: 'Settings' },
]

export default async function ClientLayout({
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
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profile?.tenant_id == null) {
    await supabase
      .from('profiles')
      .update({ tenant_id: getClientId() })
      .eq('id', user.id)
  }

  if (profile?.role === 'coach') {
    redirect('/coach/dashboard')
  }

  const { count: unseenMessagesCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  const navItems: NavItem[] = clientNavItems.map((item) => {
    if (item.href === '/client/messages') {
      return { ...item, badgeCount: unseenMessagesCount ?? 0 }
    }
    return item
  })

  return (
    <div className="flex min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)]">
      <SidebarNav navItems={navItems} />
      <AppLayout>
        <AnimatedPageWithExit>{children}</AnimatedPageWithExit>
      </AppLayout>
      <MobileBottomNav navItems={navItems} />
    </div>
  )
}

