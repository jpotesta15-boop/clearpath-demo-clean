# ClearPath Design System

Design-system documentation for handoff to Figma/Sketch/Adobe XD and for implementation consistency. Source of truth for tokens: [lib/theme/tokens.ts](../lib/theme/tokens.ts) and [app/globals.css](../app/globals.css).

---

## 1. Design tokens

### 1.1 Colors (CSS variables)

All colors use semantic `--cp-*` variables so ThemeProvider can swap per brand/coach.

| Role | Variable | Usage |
|------|----------|--------|
| **Surfaces** | | |
| Page | `--cp-bg-page` | Body / app background |
| Surface | `--cp-bg-surface` | Default content, cards (surface variant) |
| Elevated | `--cp-bg-elevated` | Raised cards, modals |
| Subtle | `--cp-bg-subtle` | Chips, badges, rails |
| Backdrop | `--cp-bg-backdrop` | Overlays, dialogs |
| **Borders** | | |
| Subtle | `--cp-border-subtle` | Default borders |
| Strong | `--cp-border-strong` | Emphasis borders |
| Focus | `--cp-border-focus` | Focus ring |
| **Text** | | |
| Primary | `--cp-text-primary` | Body, headings |
| Muted | `--cp-text-muted` | Descriptions, placeholders |
| Subtle | `--cp-text-subtle` | Secondary text |
| On accent | `--cp-text-on-accent` | Text on primary buttons |
| **Accents** | | |
| Primary | `--cp-accent-primary` | Primary buttons, links |
| Primary soft | `--cp-accent-primary-soft` | Hover backgrounds |
| Primary strong | `--cp-accent-primary-strong` | Button hover |
| Success | `--cp-accent-success` | Success states |
| Warning | `--cp-accent-warning` | Warnings |
| Danger | `--cp-accent-danger` | Errors, destructive |

Light theme: set `data-theme="light"` on `html`; values switch in globals.css.

### 1.2 Spacing (rem)

| Token | Value (rem) | Tailwind |
|-------|-------------|----------|
| xs | 0.5 | 2 |
| sm | 0.75 | 3 |
| md | 1 | 4 |
| lg | 1.5 | 6 |
| xl | 2 | 8 |
| 2xl | 3 | 12 |

### 1.3 Radii (rem)

| Token | Value | Use |
|-------|--------|-----|
| sm | 0.375 | Small controls (rounded-md) |
| md | 0.5 | Inputs, buttons |
| lg | 0.75 | Cards (rounded-lg) |
| xl | 1.25 | Hero blocks (rounded-2xl) |
| pill | 9999 | Badges, chips |

### 1.4 Shadows

| Token | Use |
|-------|-----|
| none | Flat |
| soft | Subtle elevation |
| card | Cards, raised surfaces |
| elevated | Modals, popovers |

Values in globals.css: `--cp-shadow-soft`, `--cp-shadow-card`, `--cp-shadow-elevated`.

### 1.5 Animation

| Token | Duration | Use |
|-------|----------|-----|
| page | 350ms easeOut | Page enter/exit |
| cardHover | 300ms easeOut | Card hover lift |
| button | 300ms easeInOut | Button state |

Easing: cubic-bezier(0.16, 1, 0.3, 1) for smooth, non-bouncy motion.

---

## 2. Typography

**Font:** Plus Jakarta Sans (loaded in app).

| Role | Size (rem) | Line height | Weight | Use |
|------|------------|-------------|--------|-----|
| display | 2.25 | 2.5 | 700 | Hero numbers |
| pageTitle | 1.875 | 2.25 | 700 | Page h1 |
| sectionTitle | 1.25 | 1.75 | 600 | Section headings |
| cardTitle | 1.125 | 1.75 | 600 | Card titles |
| body | 0.9375 | 1.5 | 400 | Body text |
| bodyMuted | 0.9375 | 1.5 | 400 | Descriptions (muted color) |
| caption | 0.8125 | 1.25 | 400 | Labels, errors, captions |

Letter-spacing: display -0.03em, pageTitle -0.02em, caption +0.02em.

---

## 3. Component specs

### 3.1 Button

- **Variants:** default (primary), outline, ghost.
- **Sizes:** sm (h-9, px-3, text-xs), default (h-10, px-4, text-sm), lg (h-11, px-6, text-base).
- **Radius:** rounded-md (tokens.radii.md).
- **Focus:** ring-2, ring-offset-2, ring `--cp-accent-primary-muted`, offset `--cp-bg-page`.
- **Disabled:** pointer-events-none, opacity-50.
- **Active:** scale 0.98 (tap).

File: [components/ui/button.tsx](../components/ui/button.tsx).

### 3.2 Card

- **Variants:** surface (default content), raised (dashboard tiles, left border accent), ghost (minimal).
- **Interactive:** when true, hover lift (-2px y) + card shadow; use for clickable cards.
- **CardHeader:** padding p-6, space-y-1.5.
- **CardTitle:** text-lg font-semibold (cardTitle token).
- **CardContent:** p-6 pt-0.

File: [components/ui/card.tsx](../components/ui/card.tsx).

### 3.3 Input & Form

- **Input:** h-10, rounded-md, border subtle, focus ring 2px focus color, placeholder muted.
- **FormField:** space-y-1.5 wrapper.
- **FormLabel:** text-sm font-medium, primary text.
- **FormDescription:** text-xs muted.
- **FormError:** text-sm danger, role="alert".

Files: [components/ui/input.tsx](../components/ui/input.tsx), [components/ui/form.tsx](../components/ui/form.tsx).

### 3.4 Loading

- **Full-page:** centered min-h-screen, spinner (border animation). Optional: inline button spinner, skeleton (see motion system).

File: [components/ui/loading.tsx](../components/ui/loading.tsx).

---

## 4. Page structure

- **Page title:** One h1 per page (pageTitle token).
- **Description:** Optional line below (bodyMuted).
- **Sections:** Card or section with sectionTitle; inside cards use CardTitle.
- **Spacing:** Page-level space-y-6; inside cards space-y-3 or space-y-4.

**Coach:** Dashboard = revenue/hero first, then Stripe, Next up, Ready to schedule. **Client:** Dashboard = “what’s next” first (next session, offers, then Programs/Videos). CTAs (Accept and pay, Submit availability) use accent and size to stand out.

---

## 5. Responsive & theme

- **Breakpoints:** sm 640px, md 768px, lg 1024px. Content padding: px-4 sm:px-6 lg:px-8; vertical py-8 lg:py-10. Max width: max-w-7xl.
- **Sidebar:** Expanded ~240px, collapsed ~64px; transition width.
- **Grids:** Dashboard grid-cols-1 md:grid-cols-2 lg:grid-cols-3.
- **Accent variants:** Blue, orange, purple, red, green, neutral (ThemeVariantProvider). Document primary button and link color for each for coach personalization.

---

## 6. Icons & assets

- **Nav icons:** 24px (w-6 h-6), stroke 2, currentColor (active) or muted (inactive). Prefer single set (e.g. Heroicons, Lucide).
- **Empty states:** Icon or illustration slot; one style coach/client or shared. Use for: no clients, no sessions, no programs, no messages, no payments.
- **Logo/avatar:** From [lib/branding.ts](../lib/branding.ts) (getLogo); define size in header/sidebar and client-facing areas.
