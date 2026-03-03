'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getClientName } from '@/lib/branding'

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Clients: (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Schedule: (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Programs: (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Videos: (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Messages: (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  'Session Packages': (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Payments: (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const defaultIcon = (
  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export type NavItem = { href: string; label: string }

const STORAGE_KEY = 'clearpath-sidebar-expanded'

export default function SidebarNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [brandLabel, setBrandLabel] = useState('ClearPath')
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setExpanded(stored === 'true')
  }, [])

  useEffect(() => {
    getClientName().then(setBrandLabel).catch(() => {})
  }, [])

  const toggleSidebar = () => {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-30 h-full bg-[var(--cp-bg-surface)] border-r border-[var(--cp-border-subtle)] shadow-[var(--cp-shadow-soft)] flex flex-col transition-[width] duration-200 ${
          expanded ? 'w-60' : 'w-16'
        }`}
      >
        <div className="flex h-16 items-center border-b border-[var(--cp-border-subtle)] px-3">
          {expanded ? (
            <span className="text-lg font-bold text-[var(--cp-accent-primary)] truncate">
              {brandLabel}
            </span>
          ) : (
            <span
              className="text-lg font-bold text-[var(--cp-accent-primary)] truncate"
              title={brandLabel}
            >
              CP
            </span>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const icon = iconMap[item.label] ?? defaultIcon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium border-l-2 mx-2 my-0.5 rounded-r transition-colors ${
                  isActive
                    ? 'bg-[var(--cp-accent-primary-soft)] border-[var(--cp-accent-primary)] text-[var(--cp-accent-primary)]'
                    : 'border-transparent text-[var(--cp-text-muted)] hover:bg-[rgba(148,163,184,0.12)] hover:border-[var(--cp-border-subtle)]'
                }`}
                title={!expanded ? item.label : undefined}
              >
                {icon}
                {expanded && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {expanded ? (
              <>
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
                <span className="truncate">Collapse</span>
              </>
            ) : (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            title={!expanded ? 'Logout' : undefined}
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {expanded && <span className="truncate">Logout</span>}
          </button>
        </div>
      </aside>
      <div className={`flex-shrink-0 ${expanded ? 'w-60' : 'w-16'}`} aria-hidden />
    </>
  )
}
