# n8n: Session booked alerts

Use n8n to notify both coach and client when a session is booked. Two approaches:

---

## Option A: Supabase database trigger (recommended)

n8n can react to changes on the `sessions` table:

1. **Supabase → n8n:** Use Supabase’s **Database Webhooks** (Project Settings → Database → Webhooks) or n8n’s **Supabase** node to listen for `INSERT` or `UPDATE` on `public.sessions`.
2. **Filter:** Only run your workflow when `status = 'confirmed'` (or when a new row is inserted with that status).
3. **Payload:** The trigger payload includes the row. Useful columns:
   - `id` – session UUID
   - `coach_id` – profile id of the coach
   - `client_id` – clients.id
   - `scheduled_time` – ISO timestamp
   - `availability_slot_id`
   - `status`

To get **client email** and **coach name** for the alert, in n8n add a step that queries Supabase (or use a small workflow that fetches from `clients` by `client_id` and `profiles` by `coach_id`).

**Table:** `public.sessions`  
**Key columns:** `id`, `coach_id`, `client_id`, `scheduled_time`, `status`, `created_at`

---

## Option B: App webhook (optional)

The app can call an n8n webhook when a session is confirmed. That webhook is:

- **URL:** `POST /api/webhooks/n8n-session-booked` (this app does not call n8n directly; you configure n8n to expose a webhook URL, then the app calls that URL from the server — or the app calls its own route which forwards to your n8n webhook URL using an env var).

To keep n8n and the app decoupled, the app exposes a **local** route that runs when a session is booked and then **forwards** the event to a URL you set (e.g. your n8n webhook). Set `N8N_SESSION_BOOKED_WEBHOOK_URL` and optionally `N8N_SESSION_BOOKED_SECRET`. When a session is confirmed (schedule flow), the app POSTs to that URL with a payload like:

```json
{
  "session_id": "uuid",
  "coach_id": "uuid",
  "client_id": "uuid",
  "scheduled_time": "2025-03-15T14:00:00.000Z",
  "client_email": "client@example.com",
  "client_name": "Jane Doe",
  "coach_name": "Coach Name",
  "coach_email": "coach@example.com"
}
```

**App webhook (Option B) — implemented:** When a session is confirmed (from Schedule), the app calls `POST /api/webhooks/n8n-session-booked` with `{ session_id, coach_id, client_id, scheduled_time }`. The route enriches this with client email/name and coach name/email, then forwards to the URL in **`N8N_SESSION_BOOKED_WEBHOOK_URL`** (optional). Set that env var to your n8n webhook URL to have the app push session-booked events to n8n. If unset, the route still returns 200 and does not forward. The payload includes `coach_email` so n8n can email the coach without an extra Supabase lookup.

**Ready-to-use n8n workflow:** Import `docs/n8n-session-booked-workflow.json` and follow [docs/n8n-session-booked.md](n8n-session-booked.md) to send email alerts to coach and client when a session is booked.
