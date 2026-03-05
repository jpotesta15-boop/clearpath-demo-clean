# UI Review: Coach and Client Perspectives

*What I want from the UI, what looks appealing, and what feels off, empty, or squished—from both coach and client viewpoints. Companion to COACH_PERSONA_REVIEW.md and CLIENT_PERSONA_REVIEW.md.*

---

## As a coach

### What I want from the UI

- **Dashboard first.** I want to land on something that answers “How’s my week?” and “What needs attention?” in one glance. Revenue and the week chart should be visible at the top so I don’t have to scroll or open tiles to see the numbers. A single big number (e.g. total revenue) that feels alive—like a count-up on load—makes the dashboard feel responsive and real.

- **Nothing squished.** Tiles and cards need padding and spacing so I’m not clicking by accident or feeling cramped. The nav order should match how I work: Dashboard, then Schedule and Clients, then Messages, then content (Programs, Videos), then Session Packages and Payments, then Analytics and Settings last.

- **Clear hierarchy.** Headings, body text, and muted copy should be easy to scan. I want a modern, readable font and enough contrast so I can work in different lighting. Light mode is important when I’m in a bright room or prefer a lighter screen.

- **Consistent motion.** Subtle entrance and stagger on lists and cards make the app feel polished. I don’t want flashy animation—just a bit of “breathing” so the interface doesn’t feel static.

### What looks appealing

- **Revenue hero at the top** with total and this-week numbers plus the weekly bar chart. That’s the right priority.

- **Accent color choice** in Settings (blue, green, red, purple, amber, teal) so I can match my brand or mood.

- **Theme mode** (Dark / Light / System) so I can switch when my environment changes.

- **Stripe and “Revenue & activity” cards** after the chart keep setup and deep-dive links visible without competing with the main numbers.

- **Next up and Ready to schedule** blocks with clear links to Schedule—actionable and easy to tap.

### What feels off, empty, or squished

- **Dashboard (before layout changes):** The revenue chart was at the bottom and the six tiles (Revenue, Clients, Upcoming, Pending, Messages, This Week) could feel tight on smaller screens. Moving the chart up and giving tiles more gap and min-height fixes the “squished” feel. The welcome line and tagline should have a bit of space below so the first card doesn’t sit right on the headline.

- **Client list:** When there are no clients, the empty state is better with a short line and a clear “Add your first client” CTA. List rows need enough padding so names and emails don’t feel cramped.

- **Schedule:** The calendar and list of sessions are the core. Dense rows or tiny tap targets make it harder to use on mobile. Breathing room between “Pending session requests” and the calendar helps.

- **Programs and Videos:** Folder-style programs and filters/search in the video library help. Empty states (“No programs yet”, “No videos”) should suggest the next step (e.g. create a program, add a video).

- **Messages:** Thread list and the session-request bubble need clear “mark as read” and “Pay now” where relevant. Long threads can feel dense; a bit more spacing between messages and a clear unread indicator keep it scannable.

- **Settings:** Theme and accent cards are clearer when Theme mode (Dark/Light/System) is separate from Accent color. Labels like “Accent color” avoid confusion with “Theme” meaning both mode and color.

**Priority:** Fix squished dashboard (charts at top, spacing, count-up) and nav order first; then consistent empty states and padding across coach pages; then light mode and extra accent colors.

---

## As a client

### What I want from the UI

- **One place for “what’s next”.** My dashboard should show my next session, any unpaid or pending offers, and a short path to Programs or Videos. I don’t want to hunt for “what do I do now?”

- **Readable and calm.** Same as coach: good font, enough contrast, and optional light mode so I can use the portal in a bright gym or at night. Cards and lists should feel consistent so every page feels like part of one app.

- **Clear actions.** Every block should tell me what to do: “Accept and pay”, “Submit when you’re free”, “Open Programs”, “Watch video”. Empty areas should say why they’re empty and what to do (e.g. “Your coach will add availability” or “Accept an offer above to get started”).

### What looks appealing

- **Schedule page** with offers, amounts in dollars, and clear states (Accept and pay, Submit availability, Confirmed). The flow from offer → pay → submit availability → see confirmed session is straightforward.

- **Programs and Videos** that look like one system: programs as folders or lists, videos with filters and search so I can find what my coach assigned.

- **Messages** with a clear thread and session-related actions (e.g. Pay now) when relevant. I like when the coach’s branding (logo, tagline) shows in the client portal so it feels like “my coach’s app.”

### What feels off, empty, or squished

- **Client dashboard:** If there’s no upcoming session and no offers, the page can feel empty. A single line of copy (“Nothing scheduled yet. Your coach may send you an offer.”) and a link to Schedule or Messages helps. Cards should have consistent padding so the client dashboard doesn’t feel tighter or looser than Schedule or Programs.

- **Schedule:** “No sessions scheduled” and “No available slots” are clearer with one extra sentence and a CTA (e.g. “Your coach will add availability” or “Accept an offer above to get started”). Slot rows and session rows need enough tap area and spacing.

- **Programs / Videos:** Empty states (“No programs assigned”, “No videos”) should point to what happens next (e.g. “Your coach will assign programs here”) so I don’t wonder if something is broken.

- **Messages:** Same as coach: a bit more spacing between messages and a clear unread state so I know what’s new. Session request bubbles and Pay now links should be obvious.

- **Client settings:** Simple and minimal is good. If the client can see timezone or notification prefs, they should look like the rest of the app (same card style, spacing, and typography).

**Priority:** Consistent cards and spacing across client pages; clear empty states with one-line copy and CTAs; optional light mode so the client can choose; then small motion (e.g. cards fading in) for polish.

---

## Summary

- **Coach:** Put charts and revenue at the top, give the dashboard breathing room and a revenue count-up, reorder nav (Dashboard → Schedule → Clients → Messages → Programs → Videos → Session Packages → Payments → Analytics → Settings), add theme mode and more accent colors, and tighten empty states and padding across coach pages.

- **Client:** Keep the Schedule flow and clear CTAs; unify card style and spacing; add helpful empty-state copy and optional light mode; then add light motion for a more polished feel.

These changes align the UI with what both coach and client would want: clarity, no squish, a bit of motion, and control over appearance (theme mode and accent color).
