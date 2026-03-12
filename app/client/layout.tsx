import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientId } from '@/lib/config'
import SidebarNav, { NavItem } from '@/components/SidebarNav'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { AppLayout } from '@/components/layout/AppLayout'
import { AnimatedPageWithExit } from '@/components/layout/AnimatedPage'
import { ClientBrandWrapper } from '@/components/providers/ClientBrandWrapper'
import { getCoachBrand, getPortalCustomization } from '@/lib/brand-resolver'

const ALL_CLIENT_NAV: { href: string; label: string; section: string }[] = [
  { href: '/client/dashboard', label: 'Home', section: 'home' },
  { href: '/client/programs', label: 'Programs', section: 'programs' },
  { href: '/client/schedule', label: 'Schedule', section: 'schedule' },
  { href: '/client/videos', label: 'Videos', section: 'videos' },
  { href: '/client/messages', label: 'Messages', section: 'messages' },
  { href: '/client/settings', label: 'Settings', section: 'settings' },
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

  const tenantId = profile?.tenant_id ?? getClientId()
  const { data: clientRow } = await supabase
    .from('clients')
    .select('coach_id')
    .eq('email', user.email)
    .maybeSingle()

  const coachId = (clientRow as { coach_id?: string } | null)?.coach_id ?? null
  const [brand, portalCustom] = await Promise.all([
    coachId ? getCoachBrand(supabase, coachId) : null,
    coachId ? getPortalCustomization(supabase, coachId, tenantId) : null,
  ])

  const enabledSections = new Set(portalCustom?.portalNavEnabled ?? ['schedule', 'messages', 'programs', 'videos', 'payments'])
  const navItems: NavItem[] = ALL_CLIENT_NAV
    .filter((item) => item.section === 'home' || item.section === 'settings' || enabledSections.has(item.section))
    .map(({ href, label }) => ({ href, label }))

  return (
    <ClientBrandWrapper brand={brand ?? null}>
      <div className="flex min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)]">
        <SidebarNav navItems={navItems} />
        <AppLayout>
          <AnimatedPageWithExit>{children}</AnimatedPageWithExit>
        </AppLayout>
        <MobileBottomNav navItems={navItems} />
      </div>
    </ClientBrandWrapper>
  )
}

