# Performance Audit

This document summarizes the application’s performance posture: redundant database queries, re-renders, client bundles, server component opportunities, and slow-loading pages. It ends with the **top 5 improvements** to reduce page load time.

---

## 1. Redundant and sequential database queries

### Coach dashboard (`app/coach/dashboard/page.tsx`)

- **~15 sequential round-trips**: `getUser` → `clients` → `upcomingSessions` → `pendingSessions` → `unseenMessagesCount` → `nextSessionRow` → `completedCount` → `canceledCount` → `coachProfile` → `availabilitySlotsCount` → `sessionProductsCount` → `revenueRows` → `availabilityRequests` → `recentMessagesRows` → `recentMessageProfiles` → `latestDailyMessages`.
- **Redundancy**: `unseenMessagesCount` is also fetched in **coach layout** for the nav badge. Every coach page load runs layout + page; the dashboard therefore requests the same count twice.
- **Opportunity**: After `getUser`, run all data fetches in one or two `Promise.all()` batches (e.g. one for counts + profile, one for lists). Share or derive `unseenMessagesCount` from layout or a single source to avoid duplicate queries.

### Coach client detail (`app/coach/clients/[id]/page.tsx`)

- **~10 sequential round-trips**: `getUser` → `client` → `sessions` → `programs` → `sessionRequests` → `completedCount` → `upcomingCount` → `videosCompletedCount` → `lastSession`.
- **Opportunity**: Once `client` is loaded, the remaining 7 queries (sessions, programs, sessionRequests, completedCount, upcomingCount, videosCompletedCount, lastSession) are independent and can be run in parallel with `Promise.all()`.

### Client dashboard (`app/client/dashboard/page.tsx`)

- **7 sequential round-trips**: `getUser` → `client` → `upcomingSessions` → `programs` → `dailyMessages` → (conditional) `clientExperience` → `unpaidRequests`.
- **Opportunity**: After `client` is known, run `upcomingSessions`, `programs`, `dailyMessages`, `clientExperience` (when coach_id/client_id exist), and `unpaidRequests` in a single `Promise.all()`.

### Client programs (`app/client/programs/page.tsx`)

- **4 sequential round-trips**: `getUser` → `client` → `assignments` → `lessonsByProgram` (per program set).
- **Opportunity**: Fetch `assignments` and, if needed, `lessonsByProgram` in parallel after `client` (or in one batch with client).

### Coach layout (`app/coach/layout.tsx`)

- **4 sequential**: `getUser` → `profile` → `unseenMessagesCount` → `recentPaymentsCount`.
- **Opportunity**: Run `profile`, `unseenMessagesCount`, and `recentPaymentsCount` in parallel after `getUser`.

### Coach schedule (`app/coach/schedule/page.tsx`) – client-side

- **8 sequential requests in `loadData`**: `getUser` → `profiles` (timezone) → then 6 Supabase queries (slots, sessions, clients, session_products, session_requests, client_time_requests) one after another.
- **Opportunity**: Run the 6 data queries in `Promise.all()` so only 3 steps: user → profile + 6-way parallel data.

### Coach programs [id] (`app/coach/programs/[id]/page.tsx`) – client-side

- **Sequential in `loadData`**: program → lessons → videos → assignedClients → allClients → (conditional) completions. Several of these can run in parallel after `program` is loaded (e.g. lessons, videos, assignedClients, allClients in one `Promise.all`, then completions if needed).

### Coach messages (`app/coach/messages/page.tsx`) – client-side

- **Cascade**: `loadClients()` then `loadMessages()` when `selectedClient` is set. `refreshUnreadCounts` runs after both. No duplicate queries for the same resource, but initial load is two phases (clients then messages for first client).

---

## 2. Unnecessary re-renders

- **Coach/Client messages**: Large local state (messages, clients, selectedClient, sessionProducts, modals, etc.). Any state update can re-render the whole page. Consider isolating message list and thread in smaller components with `React.memo` or moving static parts to server components so only the thread re-renders on new messages.
- **Coach schedule**: Many `useState` values (slots, sessions, clients, sessionProducts, sessionRequests, clientTimeRequests, loading, modals, etc.). Single `loadData()` does multiple `setState` calls; could batch with a single state slice or `useReducer` to reduce re-renders from N to 1 after load.
- **Coach programs [id]**: Same pattern: one `loadData` updates many state setters (setProgram, setLessons, setCompletionByClient, setLibraryVideos, setClients, setAllClients, setLoading), causing several re-renders. Batching or a single state update would help.
- **DashboardContent**: Uses `useEffect` to tick `currentTime` every 60s; fine. No obvious redundant re-renders from props; main cost is initial client bundle (recharts + framer-motion).

---

## 3. Large client bundles

- **Heavy dependencies** (from `package.json`): `recharts`, `framer-motion`, `@dnd-kit/*` are all used in client components and pull into the main or route chunks.
- **Usage**:
  - **recharts**: `DashboardContent.tsx` (coach dashboard), `AnalyticsContent.tsx` (coach analytics). Loaded on coach dashboard and analytics.
  - **framer-motion**: `DashboardContent.tsx`, `AnalyticsContent.tsx`, `login/page.tsx`, `clients/new/page.tsx`, `modal.tsx`, `card.tsx`, `AnimatedPage.tsx`. Used in many routes; card/modal are shared, so motion is likely in a common chunk.
  - **@dnd-kit**: Only `app/coach/programs/[id]/page.tsx` (lesson reordering). Not used on other pages.
- **Opportunity**: Dynamic-import recharts and dnd-kit so they load only on the routes that need them (e.g. `next/dynamic` for the dashboard chart and for the program detail page). This reduces initial JS for client schedule, messages, and other pages that don’t use charts or drag-and-drop.

---

## 4. Opportunities for server components

- **Client schedule** (`app/client/schedule/page.tsx`): Entire page is `'use client'`; data is loaded in `useEffect` via `loadData()`. **Opportunity**: Convert to a server page that fetches client, slots, sessions, session_requests, client_time_requests in parallel and passes them as props to a client component that only handles interactivity (booking, pay, decline, modals). This removes the “blank → loading → content” waterfall and improves LCP.
- **Coach schedule** (`app/coach/schedule/page.tsx`): Same pattern—full client, `loadData()` on mount. **Opportunity**: Server component fetches user, profile, slots, sessions, clients, session_products, session_requests, client_time_requests in parallel; pass to a client component for calendar UI and mutations. First paint can show structure and data without waiting for client JS + multiple round-trips.
- **Coach messages** (`app/coach/messages/page.tsx`): Full client; loads clients then messages. **Opportunity**: Server component fetches clients and (e.g.) first thread’s messages in parallel; render list and first thread on the server; client component handles realtime and sending. Reduces “loading” time and number of client-side fetches.
- **Client messages** (`app/client/messages/page.tsx`): Full client; loads client, coach, messages, session_requests in `loadData()`. **Opportunity**: Server component fetches client, coach, initial messages, and session_requests; client component only for realtime and compose. Improves first contentful paint.
- **Coach programs [id]** (`app/coach/programs/[id]/page.tsx`): Full client; program, lessons, videos, assignments loaded in `loadData()`. **Opportunity**: Server component loads program (with coach check), lessons, videos, assigned clients, all clients; pass to client component for reorder (dnd-kit), add lesson, assign. Chart/recharts can stay in a dynamically imported client component if needed elsewhere; program edit page doesn’t need recharts.

---

## 5. Slow loading pages (summary)

| Page | Why it’s slow |
|------|----------------|
| **Coach dashboard** | Many sequential DB queries; layout also fetches; heavy client bundle (recharts, framer-motion) for DashboardContent. |
| **Coach schedule** | Client-only; no SSR data; 8 sequential requests after JS loads; large component tree. |
| **Client schedule** | Client-only; no SSR data; 6+ requests in `loadData` after JS; user sees skeleton then content. |
| **Coach client [id]** | Server component but ~10 sequential DB round-trips; no parallelization. |
| **Coach messages** | Client-only; loadClients then loadMessages; two-phase load. |
| **Client messages** | Client-only; loadData fetches client, coach, messages, requests; no SSR. |
| **Coach programs [id]** | Client-only; loadData fetches program, lessons, videos, clients, completions; includes full dnd-kit bundle. |
| **Client dashboard** | Server component but 7 sequential queries; could parallelize after client. |

---

## 6. Top 5 improvements to reduce page load time

### 1. Parallelize coach dashboard data fetching (high impact)

- **Where**: `app/coach/dashboard/page.tsx`
- **What**: After `getUser()`, run all Supabase reads in one or two `Promise.all()` batches instead of ~15 sequential awaits.
- **Why**: Dashboard is a primary landing page; cutting 15 round-trips to ~2 (e.g. one for profile + counts, one for lists) significantly reduces TTFB and time to interactive.
- **Optional**: Avoid duplicate `unseenMessagesCount` (already in layout) by having the layout pass it down or by fetching it once in layout and not again on dashboard.

### 2. Convert client schedule and coach schedule to server data + client UI (high impact)

- **Where**: `app/client/schedule/page.tsx`, `app/coach/schedule/page.tsx`
- **What**: Make the page a server component that fetches all schedule data in parallel (user, client/coach, slots, sessions, requests, etc.). Pass data as props to a client component that only handles interactions (select slot, pay, approve, modals). Keep realtime/refetch in the client component if needed.
- **Why**: Removes the “load JS → then run loadData() → then 6–8 sequential or parallel requests” waterfall. First paint can include content; LCP and TTI improve.

### 3. Parallelize coach client detail and client dashboard (medium–high impact)

- **Where**: `app/coach/clients/[id]/page.tsx`, `app/client/dashboard/page.tsx`
- **What**: In client detail, after loading `client`, run the remaining 7 queries in `Promise.all()`. In client dashboard, after loading `client`, run `upcomingSessions`, `programs`, `dailyMessages`, `clientExperience`, `unpaidRequests` in `Promise.all()`.
- **Why**: Reduces multiple round-trips to one parallel batch per page, lowering latency for two frequently used flows.

### 4. Lazy-load heavy client libraries (medium impact)

- **Where**: Routes that use recharts or @dnd-kit.
- **What**: Use `next/dynamic` to load the chart (and the component that uses recharts) only on coach dashboard and analytics. Use dynamic import for the program detail page (or the sortable lesson list) so @dnd-kit is only loaded on `/coach/programs/[id]`.
- **Why**: Shrinks initial JS for client schedule, client messages, coach messages, and other pages that don’t use charts or drag-and-drop; improves FCP and TTI on those routes.

### 5. Parallelize coach layout and reduce duplicate count query (medium impact)

- **Where**: `app/coach/layout.tsx`, and optionally `app/coach/dashboard/page.tsx`
- **What**: In layout, run `profile`, `unseenMessagesCount`, and `recentPaymentsCount` in parallel after `getUser()`. Either reuse layout’s `unseenMessagesCount` for dashboard (e.g. via context or passing from layout) or fetch it only once in dashboard and pass badge count up/layout reads from same source, so the same count isn’t requested twice on every coach navigation.
- **Why**: Faster layout render on every coach page; less duplicate work and fewer round-trips on dashboard.

---

## 7. Summary table

| Improvement | Type | Impact | Effort |
|-------------|------|--------|--------|
| Parallelize coach dashboard queries | DB | High | Low |
| Server data for client/coach schedule | Architecture | High | Medium |
| Parallelize coach client [id] + client dashboard | DB | Medium–High | Low |
| Lazy-load recharts + dnd-kit | Bundle | Medium | Low |
| Parallelize layout + dedupe unseen count | DB + redundancy | Medium | Low |

Implementing these five will reduce page load time by decreasing database round-trips, moving data loading to the server for key pages, and shrinking and deferring heavy client JavaScript.
