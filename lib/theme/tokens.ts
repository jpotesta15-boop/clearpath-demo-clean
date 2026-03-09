export type ColorRole =
  | "background.page"
  | "background.surface"
  | "background.elevated"
  | "background.subtle"
  | "background.backdrop"
  | "border.subtle"
  | "border.strong"
  | "border.focus"
  | "text.primary"
  | "text.muted"
  | "text.subtle"
  | "text.onAccent"
  | "accent.primary"
  | "accent.primarySoft"
  | "accent.primaryStrong"
  | "accent.success"
  | "accent.warning"
  | "accent.danger"

export type SpacingToken = "xs" | "sm" | "md" | "lg" | "xl" | "2xl"

export type RadiusToken = "sm" | "md" | "lg" | "xl" | "pill"

export type ShadowToken = "none" | "soft" | "card" | "elevated"

export type TypographyRole =
  | "display"
  | "pageTitle"
  | "sectionTitle"
  | "cardTitle"
  | "body"
  | "bodyMuted"
  | "caption"

export interface TypographyToken {
  fontSizeRem: number
  lineHeightRem: number
  fontWeight: 400 | 500 | 600 | 700
  letterSpacingEm?: number
}

export interface AnimationTimingToken {
  durationMs: number
  easing: "easeOut" | "easeInOut"
}

export interface AnimationTokens {
  page: AnimationTimingToken
  cardHover: AnimationTimingToken
  button: AnimationTimingToken
  modal: AnimationTimingToken
  listStaggerDelayMs: number
  skeletonPulseMs: number
}

export interface ThemeTokens {
  colors: Record<ColorRole, string>
  spacing: Record<SpacingToken, number>
  radii: Record<RadiusToken, number>
  shadows: Record<ShadowToken, string>
  typography: Record<TypographyRole, TypographyToken>
  animation: AnimationTokens
}

/**
 * Global design tokens for the ClearPath UI.
 *
 * These are semantic roles, not direct Tailwind classes. Colors are expressed
 * as CSS variable references so that the ThemeProvider can swap values
 * dynamically per brand / coach while components stay stable.
 */
export const tokens: ThemeTokens = {
  colors: {
    // Surfaces & backgrounds
    "background.page": "var(--cp-bg-page)", // dark athletic base
    "background.surface": "var(--cp-bg-surface)", // default content surface
    "background.elevated": "var(--cp-bg-elevated)", // raised cards / modals
    "background.subtle": "var(--cp-bg-subtle)", // subtle chips, badges, rails
    "background.backdrop": "var(--cp-bg-backdrop)", // overlays & dialogs

    // Borders
    "border.subtle": "var(--cp-border-subtle)",
    "border.strong": "var(--cp-border-strong)",
    "border.focus": "var(--cp-border-focus)",

    // Typography
    "text.primary": "var(--cp-text-primary)",
    "text.muted": "var(--cp-text-muted)",
    "text.subtle": "var(--cp-text-subtle)",
    "text.onAccent": "var(--cp-text-on-accent)",

    // Accents
    "accent.primary": "var(--cp-accent-primary)",
    "accent.primarySoft": "var(--cp-accent-primary-soft)",
    "accent.primaryStrong": "var(--cp-accent-primary-strong)",
    "accent.success": "var(--cp-accent-success)",
    "accent.warning": "var(--cp-accent-warning)",
    "accent.danger": "var(--cp-accent-danger)",
  },

  /**
   * Spacing scale (in rem), aligned to the Tailwind steps actually in use:
   * - xs: 0.5rem (2)
   * - sm: 0.75rem (3)
   * - md: 1rem (4)
   * - lg: 1.5rem (6)
   * - xl: 2rem (8)
   * - 2xl: 3rem (12)
   */
  spacing: {
    xs: 0.5,
    sm: 0.75,
    md: 1,
    lg: 1.5,
    xl: 2,
    "2xl": 3,
  },

  /**
   * Radius scale (in rem), mapped to the radii seen across the app:
   * - sm: small controls (rounded-md)
   * - md: standard interactive elements
   * - lg: standard cards (rounded-lg)
   * - xl: hero / marketing blocks (rounded-2xl)
   * - pill: fully rounded badges / chips
   */
  radii: {
    sm: 0.375, // ~rounded-md
    md: 0.5,
    lg: 0.75, // ~rounded-lg with a touch more softness
    xl: 1.25, // ~rounded-2xl
    pill: 9999,
  },

  shadows: {
    none: "none",
    soft: "0 1px 2px rgba(15, 23, 42, 0.08)",
    card: "0 4px 12px rgba(15, 23, 42, 0.10)",
    elevated: "0 10px 30px rgba(15, 23, 42, 0.14)",
  },

  /**
   * Typography roles expressed as rem-based tokens. Components can either
   * map these to Tailwind utilities or apply them directly via inline styles.
   */
  typography: {
    display: {
      fontSizeRem: 2.25, // ~text-3xl
      lineHeightRem: 2.5,
      fontWeight: 700,
      letterSpacingEm: -0.03,
    },
    pageTitle: {
      fontSizeRem: 1.875, // ~text-2xl
      lineHeightRem: 2.25,
      fontWeight: 700,
      letterSpacingEm: -0.02,
    },
    sectionTitle: {
      fontSizeRem: 1.25, // ~text-xl
      lineHeightRem: 1.75,
      fontWeight: 600,
    },
    cardTitle: {
      fontSizeRem: 1.125, // ~text-lg
      lineHeightRem: 1.75,
      fontWeight: 600,
    },
    body: {
      fontSizeRem: 0.9375, // slightly tighter than default 1rem
      lineHeightRem: 1.5,
      fontWeight: 400,
    },
    bodyMuted: {
      fontSizeRem: 0.9375,
      lineHeightRem: 1.5,
      fontWeight: 400,
    },
    caption: {
      fontSizeRem: 0.8125, // ~text-xs / text-[13px]
      lineHeightRem: 1.25,
      fontWeight: 400,
      letterSpacingEm: 0.02,
    },
  },

  /**
   * Animation system: all durations are in the requested 300–400ms range,
   * with no bounce easing. Used for page transitions, card hover, button,
   * modal enter/exit, and list stagger.
   */
  animation: {
    page: {
      durationMs: 350,
      easing: "easeOut",
    },
    cardHover: {
      durationMs: 300,
      easing: "easeOut",
    },
    button: {
      durationMs: 300,
      easing: "easeInOut",
    },
    modal: {
      durationMs: 250,
      easing: "easeOut",
    },
    listStaggerDelayMs: 50,
    skeletonPulseMs: 1500,
  },
}

export type { ThemeTokens as DesignTokens }

