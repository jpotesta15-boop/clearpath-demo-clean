# Post–rollout UI audit

**Baseline:** Coach dashboard (DashboardContent, DashboardHero, DashboardKPIStrip)  
**Audit date:** Post design-system rollout  
**Scope:** All refactored and non-refactored areas

---

## Quality baseline (coach dashboard)

- **Card anatomy:** `Card variant="raised"` + `className="rounded-2xl"`, `CardContent className="p-5 sm:p-6"`.
- **Section headers:** `SectionHeader` (title + optional subtitle, meta); h3 = `text-sm font-medium text-[var(--cp-text-primary)]`.
- **Spacing:** Page container `space-y-10`; section internal `mb-3` / `mb-4` after headers.
- **Radius:** Cards use `rounded-2xl` (override on base `Card` which is `rounded-lg`).
- **Shadow:** `shadow-[var(--cp-shadow-card)]` for raised cards.
- **Buttons:** `Button` / `buttonClasses`, primary = default, secondary = outline, tertiary = ghost; `asChild` for links.
- **Badges:** `StatusBadge` with status + label; design tokens only.
- **Empty states:** Shared `EmptyState` with title, description, action (href or onClick).
- **Lists:** `ListRow` for rows; `ActionRow` for footer actions.
- **Tokens:** All text/background/border use `var(--cp-*)`; no `gray-*` or raw Tailwind semantic colors.

---

## 1. Page-by-page audit

### Coach dashboard
- **Visual consistency:** ✅ Cards, SectionHeader, Button, StatusBadge, ListRow, ActionRow, EmptyState aligned.
- **Gap:** DashboardHero is a raw `div` with `rounded-2xl`/border/shadow — not `Card`; same look but not the same primitive. **(P3)**
- **Spacing:** `space-y-10`; section spacing consistent.
- **Polish:** Clear hierarchy; primary CTAs (Schedule, Messages, Connect Stripe, View analytics) obvious. Pipeline band is dense but scannable.

### Coach clients list
- **Visual consistency:** ✅ PageHeader, EmptyState, ClientListWithActions use Card + Button.
- **Legacy:** ClientListWithActions uses `CardHeader`/`CardTitle` (not SectionHeader); selection bar is custom `rounded-lg border` div; **two custom overlays** (Set name, Delete confirm) — not shared Modal. **(P2)**
- **Card anatomy:** Client cards use `Card variant="raised"` but **no `rounded-2xl`**; default `rounded-lg`. **(P2)**

### Coach client detail
- **Visual consistency:** ✅ Refactored: Card raised + rounded-2xl, SectionHeader, KPIBlock, ListRow, StatusBadge, ActionRow, EmptyState, Button asChild.
- **Polish:** Back + Message at top; Stats → Notes → Contact/Profile/Portal → Programs → Balance → Session offers → History → Danger zone. Clear.

### Session history & notes (client detail)
- **Visual consistency:** ✅ SessionHistoryWithPay (ListRow + StatusBadge); ClientNotesEditor (Card raised, SectionHeader, ActionRow, tokens).

### Coach payments
- **Visual consistency:** ✅ PageHeader, Card raised + rounded-2xl, SectionHeader, StatusBadge in table, ActionRow in modal, EmptyState.
- **Legacy:** Record-payment uses **shared Modal**; table is native `<table>` (acceptable). No custom overlay.

### Coach messages
- **Visual consistency:** ✅ PageHeader, EmptyState when no clients, Card raised + SectionHeader for “Clients”, StatusBadge for unread count, ActionRow in request modal.
- **Legacy:** **Request session modal** is custom overlay (fixed inset-0 + div), not shared Modal. **(P2)**

### Coach schedule
- **Visual consistency:** ✅ PageHeader, Card raised + SectionHeader, ListRow, StatusBadge for session status in “Sessions (this month)”.
- **Legacy:** **Four custom overlays:** offer-from-time-request, offer-time-and-confirm, selected-day view, edit-session. Edit-session uses **Tailwind semantic colors**: `border-green-300 text-green-700 hover:bg-green-50`, `border-amber-300`, `border-red-300` — not design tokens. **(P1 for tokens, P2 for modal consolidation)**
- **Card anatomy:** “Available fighters” uses CardContent p-0 + custom header div; calendar card and sessions list use Card correctly.

### Coach settings
- **Visual consistency:** ✅ PageHeader, Card variant raised + rounded-2xl, SectionHeader for Theme mode, Accent color, Profile & preferences.
- **Gap:** Theme mode / Accent use raw `<button>` for options (not Button); styling is custom but consistent with tokens. **(P3)**

### Client schedule
- **Visual consistency:** ✅ PageHeader, Card raised + SectionHeader for Request a session, Session offers, Optional time slots, My Sessions.
- **Legacy:** **“My Sessions”** list still uses **custom status span** (`inline-block px-2 py-1 text-xs rounded` + cp-accent classes) instead of StatusBadge. **(P2)**

### Client dashboard
- **Visual consistency:** ⚠️ Uses `Card` + `CardHeader`/`CardTitle` (not SectionHeader). Cards use `shadow-[var(--cp-shadow-soft)] border-[var(--cp-border-subtle)]` and **no** `variant="raised"` or `rounded-2xl`. **(P2)**
- **Polish:** PageHeader, Button asChild for CTAs; EmptyState in Upcoming Sessions / My Programs. Balance card uses accent border/bg correctly.

### Client messages, client settings, client programs, client videos
- **Not refactored** in rollout. Likely mix of Card/CardHeader, ad hoc spacing, and possibly legacy colors. **(P2 for alignment with baseline)**

### Coach session packages
- **Legacy:** **Heavy use of `text-gray-700`, `border-gray-300`** in forms and labels; custom “Send to client” overlay. **(P1)**
- **Card/forms:** CardHeader/CardTitle; form inputs and labels not using design tokens.

### Coach programs
- **Legacy:** CardHeader/CardTitle; list layout custom. **Custom overlay** for edit. **(P2)**

### Coach analytics, coach daily message, coach videos
- **Not fully audited** but likely similar gaps (CardHeader vs SectionHeader, custom modals if any). **(P2)**

### Coach client experience (settings)
- **Not audited in detail.** **(P3)**

### Auth (login, forgot-password, set-password)
- **Visual consistency:** Login uses motion, Input, Button, FormField; full-page layout. No Card/SectionHeader pattern; acceptable for auth. **(P3)**

### Navigation (CoachNav, ClientNav, SidebarNav)
- **Legacy:** **CoachNav/ClientNav** use **`text-gray-500`, `text-gray-700`, `text-gray-900`, `border-gray-300`** instead of design tokens. **(P1 for token alignment)**

---

## 2. Cross-cutting checks

| Check | Status | Notes |
|-------|--------|--------|
| Card anatomy (raised + rounded-2xl + p-5 sm:p-6) | Mixed | Dashboard + refactored pages ✅; ClientListWithActions, client dashboard, session packages, programs lack rounded-2xl or variant |
| SectionHeader vs CardTitle | Mixed | Refactored areas use SectionHeader; client dashboard, ClientListWithActions, session packages, programs still use CardHeader/CardTitle |
| Button hierarchy | Good | Primary/default, outline, ghost used consistently where refactored |
| StatusBadge vs custom pills | Mixed | Refactored lists ✅; client schedule “My Sessions” and any remaining spans still custom |
| EmptyState | Good | Used on dashboard, clients, payments, messages, schedule, client dashboard |
| Design tokens only | Fail | session-packages (gray-*), CoachNav/ClientNav (gray-*), schedule edit modal (green/amber/red) |
| Custom overlays vs Modal | Mixed | Payments uses Modal; clients (2), messages (1), schedule (4), session packages (1), programs (1) use custom overlays |
| Spacing rhythm | Mixed | Dashboard space-y-10; AppLayout space-y-6; some pages add local space-y-6 |

---

## 3. Prioritized punch list

### P1 — High impact, fix now

1. **Replace Tailwind grays and semantic colors with design tokens**
   - **CoachNav / ClientNav:** `text-gray-500` → `text-[var(--cp-text-muted)]`, `text-gray-700` → `text-[var(--cp-text-primary)]`, `text-gray-900` → `text-[var(--cp-text-primary)]`, `border-gray-300` → `border-[var(--cp-border-subtle)]`.
   - **Session packages page:** All `text-gray-700`, `border-gray-300` → design tokens.
   - **Coach schedule – Edit session modal:** `border-green-300 text-green-700 hover:bg-green-50` → success tokens (e.g. `border-[var(--cp-accent-success)]` + bg/text vars); same for amber (warning) and red (danger).

2. **Session packages: align with design system**
   - Use SectionHeader (or at least design tokens) for form labels and inputs; Card variant raised + rounded-2xl for main content.

### P2 — Useful but can wait

3. **Use shared Modal for custom overlays**
   - ClientListWithActions: Set name, Delete confirm.
   - Coach messages: Request session.
   - Coach schedule: Offer from time request, Offer time & confirm, Edit session, Selected day (if feasible).
   - Session packages: Send to client.
   - Programs: Edit program.
   - Ensures one backdrop, focus trap, and escape behavior.

4. **Unify card anatomy where still legacy**
   - Client dashboard: Card variant="raised", rounded-2xl, SectionHeader for “Message from your coach”, “Upcoming Sessions”, “My Programs”; keep EmptyState.
   - ClientListWithActions: Add rounded-2xl to client cards; optionally SectionHeader-style header inside cards for consistency (or leave as CardTitle if product prefers).

5. **Client schedule – “My Sessions”**
   - Replace custom status span with StatusBadge (map status to StatusBadge status prop).

6. **Optional: DashboardHero as Card**
   - Wrap DashboardHero content in `Card variant="raised" className="rounded-2xl"` (or use Card + CardContent) so the hero is the same primitive as other sections.

### P3 — Optional polish

7. **Settings: theme/accent selectors**
   - Optionally use Button variant="outline" for Dark/Light and accent swatches for consistency (or keep custom for clearer “selected” state).

8. **Spacing constant**
   - Decide one page-level vertical rhythm (e.g. space-y-8 or space-y-10) and apply in AppLayout or per-route layout so all pages feel the same.

9. **Client programs, client videos, client messages, client settings**
   - Apply same card anatomy + SectionHeader + tokens as client dashboard/schedule where it fits.

10. **Analytics, daily message, coach videos**
    - Align cards and headers with baseline when touching those features.

---

## 4. Top 5 changes for a premium SaaS feel

1. **Remove all legacy gray/semantic color usage (P1)**  
   Nav and session packages and schedule edit modal should use only design tokens. This removes the “two design systems” feeling and makes the app feel intentional and consistent.

2. **Use one shared Modal for all overlays (P2)**  
   Replace custom `fixed inset-0 z-50` + div panels with the existing Modal (or a thin wrapper). Same backdrop, focus, and escape behavior everywhere reduces cognitive load and feels more polished.

3. **Unify card anatomy app-wide (P1/P2)**  
   Every content card: `Card variant="raised" className="rounded-2xl"`, `CardContent className="p-5 sm:p-6"`, and SectionHeader (or equivalent) for title/subtitle. Apply on client dashboard, ClientListWithActions, and any remaining CardHeader/CardTitle pages so scan speed and hierarchy match the coach dashboard.

4. **Replace every remaining custom status pill with StatusBadge (P2)**  
   Client schedule “My Sessions” and any other ad hoc status spans should use StatusBadge so status treatment is consistent and recognizable.

5. **Tighten spacing rhythm (P3)**  
   Pick a single page-level vertical spacing (e.g. space-y-8 or space-y-10) and use it in the main layout or per-section so list and dashboard pages don’t feel tighter or looser than the coach dashboard.

---

## 5. Summary

- **Refactored areas** (coach dashboard, client detail, payments, messages, schedule, settings, client schedule, SessionHistoryWithPay, ClientNotesEditor, ClientProfileDetails, ClientPortalAccess) are in good shape and match the baseline for cards, headers, buttons, badges, and empty states.
- **Main gaps:** Legacy colors in nav and session packages and schedule edit modal (P1); custom overlays instead of Modal (P2); client dashboard and a few other pages still on CardHeader/CardTitle and non-raised cards (P2); one remaining custom status pill on client schedule (P2).
- **Top lever for premium feel:** Token-only UI (P1), then shared Modal and unified card anatomy (P2), then StatusBadge and spacing (P2/P3).
