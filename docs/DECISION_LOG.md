# Decision log

Short notes on key product and UX decisions so future work doesn’t reverse them without reason.

---

- **Revenue at top of dashboard** – Coach dashboard shows revenue and week chart first; “How’s my week?” and “What needs attention?” before secondary tiles. ([UI_REVIEW.md](UI_REVIEW.md))

- **Empty state always has guidance** – No bare “No X” or “Loading...”; use EmptyState (or equivalent) with short copy and optional CTA so users know what to do next. ([BUILD_PLAN_UI_AND_FLOWS.md](BUILD_PLAN_UI_AND_FLOWS.md), [UX_FLOWS_AND_COPY.md](UX_FLOWS_AND_COPY.md))

- **Client dashboard = “what’s next”** – Priority order: (1) Next session, (2) Unpaid/pending offers, (3) Programs/Videos. Layout and copy make the next action obvious.

- **Nav order matches workflow** – Coach: Dashboard → Schedule → Clients → Messages → Programs → Videos → Session Packages → Payments → Analytics → Settings. Client: Dashboard → Programs → Schedule → Videos → Messages → Settings.

- **Theme mode vs accent color** – Settings expose “Theme mode” (Dark/Light/System) and “Accent color” as separate controls and labels to avoid confusion.

- **Session offer flow** – Price in dollars in UI; store cents in DB. Offer → Accept & pay / Decline → Submit availability → Coach picks time → Session created. ([BUILD_PLAN_UI_AND_FLOWS.md](BUILD_PLAN_UI_AND_FLOWS.md))

- **Motion: 200–400ms, no bounce** – Page, card hover, button, and modal use durations in this range and smooth easing; respect prefers-reduced-motion. ([MOTION_GUIDELINES.md](MOTION_GUIDELINES.md), [lib/theme/tokens.ts](../lib/theme/tokens.ts))

- **One design system** – Tokens (colors, spacing, radii, typography, animation) in [lib/theme/tokens.ts](../lib/theme/tokens.ts) and [app/globals.css](../app/globals.css); coach and client share the same components and patterns. ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md))
