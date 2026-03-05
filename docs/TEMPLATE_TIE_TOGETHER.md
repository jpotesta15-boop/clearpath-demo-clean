# What Ties the Template Together (and Ideas to Expand)

*Companion to UI_REVIEW.md. For the demo build / template that you clone per coach.*

---

## What really makes it look good, feel good, and appealing

### Single-hue theming

One color (or Neutral) plus three shades is applied everywhere: buttons, links, cards, borders, and subtle tints. The app never feels like multiple products. Accent picker: Blue, Orange, Purple, Red, Green, Neutral.

### Consistent tokens

All surfaces, borders, and text use `--cp-*` CSS variables. No hardcoded hex for brand/accent in components. ThemeVariantProvider sets the palette; globals.css defines the base dark/light surfaces. See [lib/theme/tokens.ts](../lib/theme/tokens.ts).

### Motion

Same timing (200–300ms) for hover and transitions. Card hover lift; button hover scale and active press. Optional stagger on lists/dashboards so the UI “breathes” without being flashy. See [lib/theme/animation.ts](../lib/theme/animation.ts).

### Hierarchy and spacing

Consistent card padding, section spacing, and typography. Tokens and UI_REVIEW.md describe the targets. Headings, body, and muted copy are easy to scan.

### Empty states and CTAs

Every list/page has a clear empty state and one primary next action so coaches and clients always know what to do next (e.g. “Add your first client”, “Your coach will add availability”).

### Login as “gate”

Login looks slightly different from the app: single centered column, soft grid or gradient background, form card with accent border. The boundary between “public” and “my dashboard” is clear and professional.

---

## Ideas to expand (for you to think about)

### Per-coach clone

When you clone the template for a coach, consider:

1. **Pre-fill from onboarding** – Business name, logo, or timezone from a “tenant” or onboarding step so the clone feels personalized from day one.
2. **Stable URL** – Optional subdomain or path (e.g. `app.yourproduct.com/coach-slug`) so each coach has a stable, shareable link.
3. **Client-facing branding** – Logo, tagline, and accent color driven entirely from Settings so the same codebase looks different per coach without code changes.

### Onboarding

A one-time “Get started” checklist after first login (e.g. “Add your first client”, “Set your availability”, “Create a session package”) with links to the right pages. Dismiss when complete or after a few sessions.

### Email and comms

“Notify when session booked” is the start. Later: digest emails, optional SMS, or an in-app notification center so coaches don’t miss messages or bookings.

### Analytics and reporting

Expand beyond revenue to “sessions per week”, “client retention”, or exportable reports so coaches can use the app for real business review and tax/reporting.

### White-label

If you need full white-label: custom domain per coach, optional removal of “ClearPath” from login/footer, and branding (logo, favicon, tagline) entirely from Settings.

---

## Implemented (from the ideas above)

- **Onboarding:** A “Get started” checklist on the coach dashboard (Add your first client, Set your availability, Create a session package) with links and done state. Coaches can dismiss it; state is stored in `profiles.preferences.onboarding_checklist_dismissed`. See the coach dashboard after first login.
- **Notify when session booked:** The app forwards session-booked events to n8n when `N8N_SESSION_BOOKED_WEBHOOK_URL` is set. A ready-to-import n8n workflow sends email to both coach and client. See [N8N_SESSIONS.md](N8N_SESSIONS.md) and [n8n-session-booked.md](n8n-session-booked.md); workflow file: `docs/n8n-session-booked-workflow.json`.

Per-coach clone (pre-fill, stable URL), analytics expansion, and white-label remain ideas to consider.
