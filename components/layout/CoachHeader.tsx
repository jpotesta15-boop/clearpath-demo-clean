'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export function CoachHeader() {
  const [currentTime, setCurrentTime] = useState(() => format(new Date(), 'h:mm a · EEEE, MMMM d'))

  useEffect(() => {
    const tick = () => setCurrentTime(format(new Date(), 'h:mm a · EEEE, MMMM d'))
    const id = setInterval(tick, 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className="flex-shrink-0 flex items-center justify-end border-b border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-4 sm:px-6 lg:px-8 h-12"
      aria-label="Coach header"
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full bg-[var(--cp-accent-success)] animate-pulse"
          aria-hidden
        />
        <span className="text-sm font-medium text-[var(--cp-text-primary)]">
          {currentTime}
        </span>
      </div>
    </header>
  )
}
