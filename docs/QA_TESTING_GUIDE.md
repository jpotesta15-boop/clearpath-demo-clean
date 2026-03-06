# QA Testing Guide – ClearPath Coach OS

Use this guide to verify coach and client flows before launch or after major changes.

---

## Coach Account Checklist

| Flow | Steps | Expected |
|------|-------|----------|
| **Login** | Email/password or Google | Redirect to `/coach/dashboard` |
| **Dashboard** | View revenue, clients, upcoming, pending | Numbers match; tiles expand on click |
| **Add client** | Clients → Add client → name, email | Client appears in list |
| **Create login** | Client detail → Create login | Client can sign in with generated password |
| **Invite client** | Client detail → Send portal invite | Email sent (check Supabase Auth or inbox) |
| **Set availability** | Schedule → Add slot (date, time, product) | Slot appears on calendar |
| **Create session product** | Session Packages → Add (name, price, duration) | Product available when booking |
| **Book session** | Schedule → pick client, slot, submit | Session appears; client sees it on their Schedule |
| **Offer session** | Messages → pick client → Offer session | Client sees offer on Schedule |
| **Confirm paid request** | Schedule → Ready to schedule → pick slot, confirm | Session created; n8n fires if configured |
| **Programs** | Programs → Create → add lessons from videos → Assign to client | Client sees program on their Programs page |
| **Program video progress** | Client marks videos done; Programs → Who has access | Shows "X/Y videos done" per client |
| **Videos** | Videos → Add by URL or n8n | Video in library; assignable to clients |
| **Stripe Connect** | Dashboard → Connect Stripe | Redirect to Stripe; returns; "Stripe connected" badge |
| **Settings** | Logo, tagline, accent, theme | Changes persist on reload |
| **Daily message** | Dashboard → Post to dashboards | Client sees message on their dashboard |

---

## Client Account Checklist

| Flow | Steps | Expected |
|------|-------|----------|
| **Login** | Email/password or Google (after invite/create) | Redirect to `/client/dashboard` |
| **No client record** | Sign in with email not in clients table | "No client record" CTA; Back to login |
| **Dashboard (empty)** | View when no sessions, programs, or daily message | "Nothing scheduled yet" + Schedule/Messages links |
| **Dashboard (with content)** | View with daily message | Message from coach visible |
| **Schedule** | View offers | Accept/Decline; Pay now if offered |
| **Pay for session** | Click Pay now → Stripe Checkout | Redirect to Stripe; return to Schedule after payment |
| **Submit availability** | After pay → Submit when free | Coach sees in Ready to schedule |
| **Programs** | View assigned | Program and lessons visible |
| **Videos** | View assigned | Video embeds (YouTube, Drive, Vimeo) |
| **Mark video done** | Videos → open video → Mark done | Video shows "Done" badge; coach sees progress |
| **Messages** | Thread with coach | Send/receive; session offers inline |

---

## Edge Cases

| Scenario | How to test | Expected |
|----------|-------------|----------|
| **Rate limit** | 30+ login attempts from same IP | "Too many attempts. Please try again in a few minutes." |
| **Stripe webhook** | Complete checkout for session offer | `session_request` → paid; session created if slot pre-selected |
| **n8n session-booked** | Confirm session from Ready to schedule | Check n8n Executions for workflow run; coach and client emails sent |
| **Balance owed** | Client has unpaid session offers | Coach sees "Balance owed $X"; client sees "You owe $X" on dashboard |
| **Payment link** | Coach → Client detail → Copy payment link | Link copied; client can pay via Stripe |
| **Demo credentials** | Set `NEXT_PUBLIC_DEMO_MODE=true` | Demo credentials visible on login |
| **Demo credentials off** | Omit or set `NEXT_PUBLIC_DEMO_MODE=false` | Demo credentials hidden |

---

## Quick Smoke Test (5 min)

1. Log in as coach → Dashboard loads
2. Add one client → Client in list
3. Create login for client → Note password
4. Log out; log in as client → Client dashboard loads
5. View Schedule, Programs, Messages → No errors
6. Log in as coach → Offer session to client
7. Log in as client → Accept, Pay (if Stripe connected), Submit availability
8. Log in as coach → Confirm from Ready to schedule → Session appears

---

## References

- [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) – Env vars and Supabase config
- [AUTOMATIONS_CHECKLIST.md](AUTOMATIONS_CHECKLIST.md) – n8n setup and verification
