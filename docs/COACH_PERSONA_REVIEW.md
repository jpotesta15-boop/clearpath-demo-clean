# Coach Persona Review

*Written as if by a coach using the app daily for client management, session packages, and scheduling.*

---

## What I Love

- **Client list and detail.** One place to see everyone, click into a client, and get contact info, stats (sessions completed, upcoming, last active), and notes. Editable notes right on the profile are essential for remembering who needs what.

- **Session offers on the client profile.** I can see every session package I’ve sent to a client and whether they’re waiting, paid, or declined. The “Pick time” link when they’ve submitted availability takes me straight to Schedule so I can confirm the session.

- **Session Packages and Stripe Connect.** I create packages in dollars (e.g. $30 for 45 min), send offers to clients, and when they pay, the money goes to my connected Stripe account. No shared platform account—each coach gets paid directly.

- **Schedule and availability.** I add availability slots; when a client pays and submits when they’re free, I see “Pending session requests” on Schedule, pick a slot, and the session is on the calendar. I can also book ad hoc by choosing a client and a time.

- **Payments page.** I see all payments (Stripe and manual), filter by status/provider, and record off-platform payments (Zelle, PayPal, etc.) when needed.

- **Dashboard at a glance.** Clients count, upcoming sessions, pending requests, revenue (and revenue this week), unread messages. The expandable tiles and week mini-calendar make it scannable.

- **Programs and videos.** Build programs from my video library and assign them to clients. Messaging from the client profile keeps everything in one app.

---

## Limitations / Friction

- **Empty states.** Some pages still show bare “No X” or “Loading...” with no guidance. I’d prefer short, actionable copy (e.g. “No session offers yet. Send one from Session Packages.”) so I know what to do next.

- **Price used to be in cents.** Entering 3000 for $30 was error-prone. Now it’s in dollars, which is a big improvement.

- **Session offers used to be invisible on the client profile.** I had to remember who I’d sent offers to or check Schedule. Now they’re on the client profile with clear status and a “Pick time” link when needed.

- **No loading feedback.** When data is fetching, a simple “Loading...” doesn’t feel as polished as a light skeleton or brief animation. Some pages would benefit from consistent loading states.

- **No reminders.** I’d still like optional email or in-app reminders before a session so clients (and I) don’t forget.

---

## Wishlist

- **Session offers on client profile (done).** See all offers and status; “Pick time” when client has submitted availability.

- **Price in dollars (done).** Create and edit packages in $; store in cents under the hood.

- **Client can decline (done).** So I see “Declined” on the client profile instead of wondering why they never responded.

- **Clearer empty states.** Every list or section should have a short, helpful message when there’s no data, plus a CTA where it makes sense (e.g. “Create a package”, “Send an offer”).

- **Light load / entrance animations.** Cards or list items fading or sliding in when the page loads would make the app feel more responsive and polished.

- **Consistent card layout and spacing.** Same padding, headings, and description text across coach (and client) pages so the UI feels cohesive.

- **Optional: client picks time.** Let the client choose from my available slots after they pay, then I confirm—would reduce back-and-forth for some clients.

- **Reminders and invoicing.** Reminders before sessions; simple “you owe $X” or payment links per client (future).

---

## Summary

The app covers the core loop well: clients, notes, session packages (with Stripe Connect), offers on the client profile, accept/decline, pay, submit availability, coach picks time, session on calendar. The recent additions (price in dollars, session offers on client profile, decline, “Pick time” link) address real friction. Next priorities: **empty-state and formatting consistency**, **light animations**, and optionally **client picks time** and **reminders**.
