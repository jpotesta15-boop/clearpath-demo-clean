# Loading States Audit

This document summarizes the loading-state audit and the changes made so that async data loads use skeleton loaders consistently and loading transitions feel consistent across pages.

## Summary of Changes

### 1. Skeleton loaders instead of spinners

- **New component: `PageSkeleton`** (`components/ui/PageSkeleton.tsx`)
  - Full-page skeleton for initial data load: header placeholder (title + subtitle + action) plus 2–3 list-style skeleton cards.
  - Props: `variant` (list | hero | kpi | chart), `showHeader`, `cardCount`, `className`.
  - Uses existing `SkeletonCard` from `components/ui/SkeletonCard.tsx` (pulse animation, respects `motion-reduce`).

- **Replaced full-page spinner (`Loading`) with `PageSkeleton`** on all major data pages:
  - Coach: Programs list, Program detail, Schedule, Videos, Session Packages, Payments, Settings, Messages.
  - Client: Schedule, Messages.
  - Client schedule `Suspense` fallback now uses `PageSkeleton` instead of `Loading`.

- **`Loading`** (spinner) remains in the codebase for optional use (e.g. small or legacy flows) but is no longer used for full-page content load.

### 2. Loading states for all major queries

- **Coach Messages**
  - Added `pageLoading` state; set to `false` when `loadClients()` completes.
  - When `pageLoading`, the page renders `<PageSkeleton />` so the initial client list load is not a blank or partial layout.

- **Client Messages**
  - Added `pageLoading` state; set to `false` at the end of `loadData()` (and when user is missing or client not found).
  - When `pageLoading`, the page renders `<PageSkeleton />`.

- **Coach Settings**
  - Already had `loading`; now when `loading` the page returns `<PageSkeleton cardCount={4} />` instead of rendering the form with empty values.

- **Coach Settings (Client experience)**
  - Already had a minimal skeleton (three divs); added `animate-pulse` and `motion-reduce:animate-none` for consistency and accessibility.

- **Other pages** (Programs, Program detail, Schedule, Client schedule, Videos, Session Packages, Payments) already had a loading flag and previously used `<Loading />`; they now use `<PageSkeleton />` for the initial load.

### 3. Inline “Loading…” text replaced with skeletons

- **Coach Daily message**
  - “Recent messages” section: replaced “Loading…” with three pulse skeleton lines (content-shaped).

- **Client Settings**
  - Phone card: replaced “Loading…” with a short form-shaped skeleton (label + input + button placeholders).

- **Auth Set password**
  - Replaced “Loading…” with a small form-shaped skeleton (title, subtitle, two field placeholders) in the center of the page.

- **Login**
  - Suspense fallback: replaced “Loading…” with a compact skeleton (title + two inputs + button) so the login form shape is suggested while loading.

### 4. Consistency

- **Animation**
  - All new skeletons use `animate-pulse` and `motion-reduce:animate-none` (or the same via `SkeletonCard`) so behavior is consistent and respects user motion preferences.

- **Structure**
  - Full-page loads use `PageSkeleton` (header + cards).
  - Section-level loads use small skeleton blocks (lines or form-shaped) instead of text.

- **Accessibility**
  - Full-page and auth/settings skeletons use `aria-label="Loading"` where appropriate.

## Pages with loading states (after audit)

| Page | Loading state | UI |
|------|----------------|-----|
| Coach Programs | `loading` | PageSkeleton |
| Coach Program detail | `loading` | PageSkeleton |
| Coach Schedule | `loading` | PageSkeleton |
| Coach Videos | `loading` | PageSkeleton |
| Coach Session Packages | `loading` | PageSkeleton |
| Coach Payments | `loading` | PageSkeleton |
| Coach Settings | `loading` | PageSkeleton |
| Coach Settings (Client experience) | `loading` | Inline skeleton (pulse) |
| Coach Messages | `pageLoading` | PageSkeleton |
| Coach Daily message | `loading` (section) | Inline skeleton lines |
| Client Schedule | `loading` | PageSkeleton (+ Suspense fallback) |
| Client Messages | `pageLoading` | PageSkeleton |
| Client Settings (phone) | `phoneLoading` | Inline form skeleton |
| Auth Set password | `loading` | Form-shaped skeleton |
| Login (Suspense) | — | Form-shaped skeleton |

## Not changed

- **Button / action loading** (e.g. “Saving…”, “Creating…”, “Sending…”) remains text-based; no skeleton on buttons.
- **Server-rendered pages** (e.g. coach dashboard, client dashboard, client programs) have no client-side loading state; they stream from the server.
- **`SectionShell`** still uses `SkeletonCard` when `state === "loading"`; no change.
