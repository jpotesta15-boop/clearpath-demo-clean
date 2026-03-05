export function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen" aria-label="Loading">
      <div
        className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--cp-border-subtle)] border-t-[var(--cp-accent-primary)]"
        aria-hidden
      />
    </div>
  )
}

