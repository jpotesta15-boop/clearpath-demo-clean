# n8n: Session booked email alerts

When a session is confirmed in ClearPath, the app can forward the event to an n8n webhook. Use this workflow to send email notifications to both the coach and the client.

## Prerequisites

1. **App env:** Set `N8N_SESSION_BOOKED_WEBHOOK_URL` to your n8n webhook **Production** URL (see below). If unset, the app still runs but does not forward session-booked events.

2. **n8n:** You need an n8n instance (cloud or self-hosted) and SMTP (or Gmail/SendGrid) credentials to send email.

## Payload from the app

The app POSTs a JSON body to the URL you configure. Fields:

| Field | Description |
|-------|-------------|
| `session_id` | Session UUID |
| `coach_id` | Coach profile UUID |
| `client_id` | Client record UUID |
| `scheduled_time` | ISO timestamp of the session |
| `client_email` | Client email (for sending the client notification) |
| `client_name` | Client display name |
| `coach_name` | Coach display name |
| `coach_email` | Coach email (for sending the coach notification) |

See [N8N_SESSIONS.md](N8N_SESSIONS.md) for full payload and Option A (Supabase trigger) vs Option B (app webhook).

## Setup steps

1. **Import the workflow**  
   In n8n: **Workflows → Import from File** (or paste JSON). Open `docs/n8n-session-booked-workflow.json` from this repo.

2. **Get the webhook URL**  
   - Select the **Webhook** node.  
   - Use the **Production** URL (e.g. `https://your-n8n.com/webhook/session-booked`).  
   - The Test URL works only when “Listen for Test Event” is active.

3. **Configure the app**  
   Set in your app environment (e.g. Vercel):

   ```bash
   N8N_SESSION_BOOKED_WEBHOOK_URL=https://your-n8n.com/webhook/session-booked
   ```

4. **Configure email in n8n**  
   - Open the **Email coach** and **Email client** nodes.  
   - Attach your SMTP (or Gmail/SendGrid) credentials.  
   - Set **From Email** to a valid sender (e.g. `notifications@yourdomain.com`).  
   - The **To** fields use `{{ $json.coach_email }}` and `{{ $json.client_email }}` from the webhook payload; no change needed unless you want a different recipient.

5. **Activate the workflow**  
   Turn the workflow **Active** in n8n so the Production webhook is registered. When a session is confirmed in the app, it will POST to this URL and both emails will be sent.

## Testing

1. In the app, confirm a session (e.g. from Schedule: pick a slot and confirm).  
2. Check n8n **Executions** for the workflow run.  
3. Confirm coach and client receive the emails (check spam if needed).

## Troubleshooting

- **No execution in n8n:** Ensure `N8N_SESSION_BOOKED_WEBHOOK_URL` is set and the workflow is **Active**. Confirm the app can reach the n8n URL (no firewall blocking).
- **Emails not sent:** Check credentials on both Send Email nodes and that `coach_email` / `client_email` are present in the payload (they are set by the app when forwarding).
- **Wrong webhook path:** If you changed the Webhook node path in n8n, update `N8N_SESSION_BOOKED_WEBHOOK_URL` to match.
