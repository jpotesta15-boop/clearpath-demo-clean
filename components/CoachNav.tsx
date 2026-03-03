'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getClientName } from '@/lib/branding'

const navItems = [
  { href: '/coach/dashboard', label: 'Dashboard' },
  { href: '/coach/clients', label: 'Clients' },
  { href: '/coach/schedule', label: 'Schedule' },
  { href: '/coach/session-packages', label: 'Session Packages' },
  { href: '/coach/programs', label: 'Programs' },
  { href: '/coach/videos', label: 'Videos' },
  { href: '/coach/payments', label: 'Payments' },
  { href: '/coach/messages', label: 'Messages' },
]

export default function CoachNav() {
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
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-primary-600">{clientName}</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.href
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

