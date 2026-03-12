'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getClientName } from '@/lib/branding'

const navItems = [
  { href: '/client/dashboard', label: 'Home' },
  { href: '/client/programs', label: 'Programs' },
  { href: '/client/schedule', label: 'Schedule' },
  { href: '/client/videos', label: 'Videos' },
  { href: '/client/messages', label: 'Messages' },
]

export default function ClientNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [clientName, setClientName] = useState('ClearPath')

  useEffect(() => {
    // Get client name from config
    getClientName().then(setClientName).catch(() => {})
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="bg-[var(--cp-bg-surface)] shadow-sm border-b border-[var(--cp-border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-[var(--cp-accent-primary)]">{clientName}</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.href
                      ? 'border-[var(--cp-accent-primary)] text-[var(--cp-text-primary)]'
                      : 'border-transparent text-[var(--cp-text-muted)] hover:text-[var(--cp-text-primary)] hover:border-[var(--cp-border-subtle)]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="text-[var(--cp-text-muted)] hover:text-[var(--cp-text-primary)] px-3 py-2 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

