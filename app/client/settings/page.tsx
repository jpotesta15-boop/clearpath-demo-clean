'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeVariant, type ThemeVariant } from '@/components/providers/ThemeVariantProvider'

const VARIANT_LABELS: Record<ThemeVariant, string> = {
  blue: 'Blue',
  green: 'Green',
  red: 'Red',
  purple: 'Purple',
}

export default function ClientSettingsPage() {
  const { variant, setVariant } = useThemeVariant()

  const variants: ThemeVariant[] = ['blue', 'green', 'red', 'purple']

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
          Personalize how your client dashboard looks. This only affects your view.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Choose one of the dark athletic accent themes. All pages will update to match.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {variants.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                v === variant
                  ? 'border-[var(--cp-accent-primary)] bg-[rgba(56,189,248,0.12)]'
                  : 'border-[var(--cp-border-subtle)] hover:border-[var(--cp-accent-primary)] hover:bg-[rgba(148,163,184,0.16)]'
              }`}
            >
              <span className="text-sm font-medium text-[var(--cp-text-primary)]">
                {VARIANT_LABELS[v]}
              </span>
              <span className="mt-1 inline-flex items-center gap-1">
                <span className="h-2 w-6 rounded-full bg-[var(--cp-accent-primary)]" />
                <span className="h-2 w-6 rounded-full bg-[var(--cp-accent-primary-strong)] opacity-80" />
              </span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

