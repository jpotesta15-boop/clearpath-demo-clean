'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeVariant, type ThemeVariant, type ThemeMode, VARIANT_SWATCH_COLORS } from '@/components/providers/ThemeVariantProvider'

const VARIANT_LABELS: Record<ThemeVariant, string> = {
  blue: 'Blue',
  orange: 'Orange',
  purple: 'Purple',
  red: 'Red',
  green: 'Green',
  neutral: 'Neutral',
}

const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  dark: 'Dark',
  light: 'Light',
}

export default function ClientSettingsPage() {
  const { variant, setVariant, mode, setMode } = useThemeVariant()

  const variants: ThemeVariant[] = ['blue', 'orange', 'purple', 'red', 'green', 'neutral']

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
          <CardTitle>Theme mode</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Dark or light theme.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(['dark', 'light'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                m === mode
                  ? 'border-[var(--cp-accent-primary)] bg-[var(--cp-accent-primary-soft)] text-[var(--cp-accent-primary)]'
                  : 'border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)] hover:border-[var(--cp-accent-primary)] hover:bg-[var(--cp-bg-subtle)]'
              }`}
            >
              {THEME_MODE_LABELS[m]}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accent color</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Accent sets buttons, links, cards, and subtle tints across the site.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {variants.map((v) => {
            const [shade1, shade2, shade3] = VARIANT_SWATCH_COLORS[v]
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                  v === variant
                    ? 'border-[var(--cp-accent-primary)] bg-[var(--cp-accent-primary-soft)]'
                    : 'border-[var(--cp-border-subtle)] hover:border-[var(--cp-accent-primary)] hover:bg-[var(--cp-bg-subtle)]'
                }`}
              >
                <span className="text-sm font-medium text-[var(--cp-text-primary)]">
                  {VARIANT_LABELS[v]}
                </span>
                <span className="mt-1 inline-flex items-center gap-1">
                  <span className="h-2 w-6 rounded-full shrink-0" style={{ backgroundColor: shade1 }} />
                  <span className="h-2 w-6 rounded-full shrink-0" style={{ backgroundColor: shade2 }} />
                  <span className="h-2 w-6 rounded-full shrink-0" style={{ backgroundColor: shade3 }} />
                </span>
              </button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

