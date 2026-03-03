import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/SidebarNav'
import { AppLayout } from '@/components/layout/AppLayout'
import { AnimatedPage } from '@/components/layout/AnimatedPage'

const clientNavItems = [
  { href: '/client/dashboard', label: 'Dashboard' },
  { href: '/client/programs', label: 'Programs' },
  { href: '/client/schedule', label: 'Schedule' },
  { href: '/client/videos', label: 'Videos' },
  { href: '/client/messages', label: 'Messages' },
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

  return (
    <div className="flex min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)]">
      <SidebarNav navItems={clientNavItems} />
      <AppLayout>
        <AnimatedPage>{children}</AnimatedPage>
      </AppLayout>
    </div>
  )
}

