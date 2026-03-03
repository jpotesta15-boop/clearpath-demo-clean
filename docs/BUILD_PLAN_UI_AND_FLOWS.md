# Build Plan: UI and Flows

This plan is derived from the **Coach Persona Review** ([COACH_PERSONA_REVIEW.md](COACH_PERSONA_REVIEW.md)) and **Client Persona Review** ([CLIENT_PERSONA_REVIEW.md](CLIENT_PERSONA_REVIEW.md)). It prioritizes connecting flows and then UI polish so the product feels sharp, consistent, and free of dead space.

---

## Flows (Current State)

- **Session offer flow:** Coach creates package (price in **dollars**), sends to client → offer appears on **client profile** (Session offers card) and on client **Schedule** → client **Accept & pay** or **Decline** → if paid, client **Submit availability** → coach sees “Pending session requests” on **Schedule** and on client profile (“Pick time” link) → coach picks slot → session created, request marked scheduled.
- **Payments:** Stripe Connect; coach gets paid to their connected account. Payments and manual recording on coach Payments page.

---

## Completed (from Plan)

| Done | Task |
|------|------|
| Yes | Session package price in dollars in create/edit form; store cents in DB ([app/coach/session-packages/page.tsx](app/coach/session-packages/page.tsx)). |
| Yes | Coach client profile: fetch session_requests, “Session offers” card with status labels and “Pick time” link ([app/coach/clients/[id]/page.tsx](app/coach/clients/[id]/page.tsx)). |
| Yes | Client Schedule: “Decline” button for offered requests, set status to `cancelled` ([app/client/schedule/page.tsx](app/client/schedule/page.tsx)). |
| Yes | Coach client profile: “Pick time” links to `/coach/schedule` when status is `availability_submitted`. |

---

## Phase 1: Empty States and Copy

**Goal:** No bare “No X” or “Loading...” without guidance. Every list/section has short, actionable copy and a CTA where it makes sense.

| Priority | Location | Current | Change |
|----------|----------|---------|--------|
| 1 | Coach: Session Packages (no packages) | “No session packages yet. Create one to start sending offers.” | Keep or tighten; ensure CTA is visible (Create Package button). |
| 2 | Coach: Client profile – Session offers (none) | “No session offers yet. Send one from Session Packages.” | Already in place. |
| 3 | Coach: Client profile – Assigned Programs (none) | “No programs assigned” | Add: “Assign from Programs.” or keep minimal. |
| 4 | Coach: Schedule – Pending session requests (none) | Section hidden when empty | No change or add “When clients pay and submit availability, they’ll appear here.” when section is present but empty. |
| 5 | Client: Schedule – Session offers (none) | Section hidden when no offers | When Schedule has no offers, consider a single line: “No session offers right now. Your coach may send one soon.” (optional). |
| 6 | Client: Schedule – My Sessions (none) | “No sessions scheduled” | Add: “Sessions will appear here after you accept an offer and your coach confirms a time.” |
| 7 | Client: Schedule – Available Time Slots (none) | “No available slots” | Add: “Your coach will add availability. Check back later.” |
| 8 | Coach & Client: Loading | “Loading...” | Replace with a small skeleton or spinner + “Loading…” in a consistent component (e.g. [components/ui/loading.tsx](components/ui/loading.tsx)). |

**Files to touch:**  
[app/coach/session-packages/page.tsx](app/coach/session-packages/page.tsx), [app/coach/clients/[id]/page.tsx](app/coach/clients/[id]/page.tsx), [app/coach/schedule/page.tsx](app/coach/schedule/page.tsx), [app/client/schedule/page.tsx](app/client/schedule/page.tsx), [app/client/dashboard/page.tsx](app/client/dashboard/page.tsx), and any other coach/client pages with “No X”. Optionally add or reuse a shared empty-state component.

---

## Phase 2: Card and Layout Consistency

**Goal:** Same card layout, heading style, and description text across coach and client pages so the “OS” feels unified.

- **Card usage:** Use [components/ui/card.tsx](components/ui/card.tsx) (Card, CardHeader, CardTitle, CardContent) everywhere for sections. Avoid mixing raw divs with borders and card components.
- **Headings:** Page title (h1) + short description (text-sm text-gray-500) under it on each main page. Section titles inside cards: CardTitle + optional `text-sm font-normal text-gray-500` for descriptions.
- **Spacing:** Consistent `space-y-6` for page-level vertical rhythm; `space-y-3` or `space-y-4` inside cards. Use consistent padding (e.g. CardContent default).
- **Grids:** Use a consistent grid (e.g. `grid-cols-1 md:grid-cols-2` or `lg:grid-cols-3`) for card grids on dashboard-style pages.

**Files to audit:** All pages under `app/coach/*` and `app/client/*`; align structure with the above.

---

## Phase 3: Load / Entrance Animations

**Goal:** Lightweight motion so content doesn’t “pop” in raw; the app feels responsive and sharp.

- **Approach:** Prefer CSS-only (e.g. `@keyframes` + `animation`) or a small library (e.g. Framer Motion) for:
  - **Page load:** Cards or list containers with a short fade-in or slide-up (e.g. 200–300ms, opacity 0→1, optional translateY 4–8px).
  - **Lists:** Stagger optional (e.g. 50ms delay per item) for dense lists; keep it subtle.
- **Constraints:** No layout shift; animations should not block interaction. Prefer `opacity` and `transform` for performance.
- **Scope:** Apply to main content areas (e.g. dashboard tiles, schedule cards, client profile cards, session offers list). Skip modals and small UI unless desired later.

**Implementation:** Add a small utility class or wrapper (e.g. `animate-in` with Tailwind or a custom class in globals.css). Apply to card wrappers or list containers on key pages. If using Framer Motion, add to package.json and use `motion.div` with `initial`/`animate` only where it adds value.

**Files to touch:** [app/globals.css](app/globals.css) or Tailwind config for keyframes; [app/coach/dashboard/DashboardContent.tsx](app/coach/dashboard/DashboardContent.tsx), [app/coach/clients/[id]/page.tsx](app/coach/clients/[id]/page.tsx), [app/client/schedule/page.tsx](app/client/schedule/page.tsx), and other high-traffic views.

---

## Phase 4: Optional Enhancements (Later)

| Item | Description |
|------|-------------|
| Client picks time | After payment, show coach’s available slots on client Schedule; client picks one → create session (pending); coach confirms. Requires linking “Pick time for this offer” to slot list and session_request_id. |
| Reminders | Email or in-app reminder N hours/days before a session. |
| Invoicing / payment requests | “You owe $X” or payment link per client. |

---

## Order of Work (Summary)

1. **Phase 1:** Empty-state copy and loading UX (all relevant coach/client pages).
2. **Phase 2:** Card and layout consistency pass (audit and align coach + client pages).
3. **Phase 3:** Add entrance/load animations to main content areas.
4. **Phase 4:** Optional (client picks time, reminders, invoicing) as needed.

This keeps flows connected (already done), removes dead space (Phase 1–2), and adds polish (Phase 3) without over-engineering.
