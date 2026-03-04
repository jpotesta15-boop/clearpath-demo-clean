import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientId } from '@/lib/config'
import SidebarNav from '@/components/SidebarNav'
import { AppLayout } from '@/components/layout/AppLayout'
import { AnimatedPage } from '@/components/layout/AnimatedPage'

const clientNavItems = [
  { href: '/client/dashboard', label: 'Dashboard' },
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

  return (
    <div className="flex min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)]">
      <SidebarNav navItems={clientNavItems} />
      <AppLayout>
        <AnimatedPage>{children}</AnimatedPage>
      </AppLayout>
    </div>
  )
}

