'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to reporting service in production
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-xl font-semibold text-[var(--cp-text-primary)]">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-[var(--cp-text-muted)] text-center max-w-md">
        We couldn’t complete your request. Please try again.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
