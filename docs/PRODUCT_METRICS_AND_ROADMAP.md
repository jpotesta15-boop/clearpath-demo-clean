# Product metrics and roadmap

Companion to [BUILD_PLAN_UI_AND_FLOWS.md](BUILD_PLAN_UI_AND_FLOWS.md) and persona reviews. Use for north-star metrics, events to track, and near-term prioritization.

---

## 1. North-star metrics

### Coach

- **Sessions booked per week** – primary outcome; reflects calendar and offer flow health.
- **Time to first paid session** – from “first client added” to first session with payment; lower is better for onboarding.

### Client

- **Offer acceptance rate** – offers that become paid (vs declined or abandoned).
- **Program / video opens** – engagement with assigned content after session flow.

---

## 2. Events to track (instrumentation)

When adding analytics, consider at least:

| Event | Context |
|-------|--------|
| Offer sent | Coach sends session offer to client |
| Offer accepted | Client clicks Accept & pay |
| Offer declined | Client declines |
| Payment completed | Stripe or manual payment recorded |
| Availability submitted | Client submits availability after payment |
| Session scheduled | Coach picks time; session created |
| Program opened | Client opens a program |
| Video played / opened | Client opens assigned video |
| Client added | Coach adds or invites client |
| Stripe connected | Coach completes Connect onboarding |

---

## 3. Prioritized roadmap (next 1–2 quarters)

1. **Polish and consistency** – Empty states, loading, cards, motion (Phases 1–4 of this plan). **Done or in progress.**
2. **Coach dashboard and client schedule** – Keep as highest-traffic surfaces; any new features (e.g. client picks time) should not regress these.
3. **Client picks time** – After payment, show coach’s available slots on client Schedule; client picks one → session created (pending); coach confirms. High impact, medium effort.
4. **Reminders** – Email or in-app reminder N hours/days before a session.
5. **Invoicing / payment requests** – “You owe $X” or payment link per client.

Order by impact vs effort with [COACH_PERSONA_REVIEW.md](COACH_PERSONA_REVIEW.md) and [CLIENT_PERSONA_REVIEW.md](CLIENT_PERSONA_REVIEW.md) in mind.

---

## 4. Consistency checklist (coach vs client)

- [ ] Same card style (Card, CardHeader, CardTitle, CardContent) on both sides.
- [ ] Same empty-state pattern (EmptyState: icon, title, description, optional CTA).
- [ ] Same loading pattern (Loading full-page; inline spinner for buttons).
- [ ] Same page structure: h1 + optional description, then sections with consistent spacing (space-y-6, space-y-3/4 in cards).
- [ ] Same motion: page transition, optional stagger on lists; no flashy differences between coach and client.
- [ ] Theme and accent: both support light/dark and accent color; copy separates “Theme mode” from “Accent color.”

---

## 5. Edge cases and error copy

| Scenario | Suggested copy / behavior |
|----------|---------------------------|
| Stripe not connected | “Connect Stripe to accept payments.” CTA: Connect Stripe. |
| No clients | EmptyState: “No clients yet” + “Add your first client.” |
| Session cancelled | Status label “Cancelled”; no primary CTA. |
| Payment fails | “Payment didn’t go through. Check your card or try again.” Safe, no stack trace. |
| Auth / rate limit | From URL params: short message (e.g. “Too many attempts. Try again later.”). |
| API error | “Something went wrong. Please try again.” Optional retry. |
| Request hangs | After timeout: “This is taking longer than usual. Try again.” |

Keep error messages safe (no internal details) and actionable where possible.
