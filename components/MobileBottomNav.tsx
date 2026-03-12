'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { NavItem } from './SidebarNav'

const iconMap: Record<string, React.ReactNode> = {
  Home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m-4 0h10a2 2 0 002-2v-5.586a1 1 0 00-.293-.707l-7-7a1 1 0 00-1.414 0l-7 7A1 1 0 003 12.414V18a2 2 0 002 2z"
      />
    </svg>
  ),
  Schedule: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  Clients: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  Programs: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  ),
  Videos: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Messages: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  Settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 2.31.841 1.37 1.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.841 2.31-1.37 1.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-2.31-.841-1.37-1.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.841-2.31 1.37-1.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
}

const defaultIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
)

export function MobileBottomNav({ navItems }: { navItems: NavItem[] }) {
  const pathname = usePathname()
  const [navState, setNavState] = useState<NavItem[]>(navItems)

  useEffect(() => {
    setNavState(navItems)
  }, [navItems])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleUnreadUpdate = () => {
      setNavState((current) =>
        current.map((item) =>
          item.href.endsWith("/messages") ? { ...item, badgeCount: 0 } : item
        )
      )
    }

    window.addEventListener(
      "clearpath:unread-messages-updated",
      handleUnreadUpdate as EventListener
    )

    return () => {
      window.removeEventListener(
        "clearpath:unread-messages-updated",
        handleUnreadUpdate as EventListener
      )
    }
  }, [])

  if (!navState || navState.length === 0) return null

  const firstHref = navState[0]?.href ?? ""
  const isCoach = firstHref.startsWith("/coach")

  const primaryLabels = isCoach
    ? new Set(["Home", "Schedule", "Clients", "Messages", "Settings"])
    : new Set(["Home", "Programs", "Schedule", "Messages", "Settings"])

  const items = navState.filter((item) => primaryLabels.has(item.label))

  if (items.length === 0) return null

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)]/95 backdrop-blur-md md:hidden"
      aria-label="Primary navigation"
    >
      <div className="flex items-stretch justify-around h-14 px-1">
        {items.map((item) => {
          const isActive = pathname === item.href
          const icon = iconMap[item.label] ?? defaultIcon
          const badge = item.badgeCount ?? 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex-1 flex flex-col items-center justify-center text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)] rounded-t-lg"
              aria-current={isActive ? "page" : undefined}
            >
              <div
                className={`flex flex-col items-center gap-0.5 ${
                  isActive
                    ? "text-[var(--cp-accent-primary)]"
                    : "text-[var(--cp-text-muted)]"
                }`}
              >
                <span>{icon}</span>
                <span className="leading-none">{item.label}</span>
              </div>
              {badge > 0 && (
                <span className="absolute top-1 right-4 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--cp-accent-primary)] px-1 py-0.5 text-[9px] font-semibold text-[var(--cp-text-on-accent)]">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

