# n8n Automations – Connection Checklist

Use this checklist to connect ClearPath to n8n and verify automations are live.

---

## Prerequisites

- n8n instance (cloud or self-hosted)
- App env vars set:
  - `N8N_VIDEO_WEBHOOK_SECRET` (if using video workflows)
  - `N8N_SESSION_BOOKED_WEBHOOK_URL` (if using session-booked emails)
  - `N8N_DEFAULT_COACH_ID` (optional; coach UUID when n8n omits `coach_id`)

---

## 1. Session Booked (Email Coach + Client)

When a session is confirmed, the app forwards the event to n8n. This workflow sends email notifications to both coach and client.

### Setup Steps

1. Import [n8n/session-booked-workflow.json](../n8n/session-booked-workflow.json) into n8n
   - n8n → Workflows → Import from File
2. Copy the **Webhook** node **Production** URL
   - Example: `https://your-n8n.com/webhook/session-booked`
   - Use Production URL, not Test URL
3. Set `N8N_SESSION_BOOKED_WEBHOOK_URL` in your app environment (Vercel, `.env.local`)
4. Configure **Email coach** and **Email client** nodes:
   - Add SMTP credentials (Gmail, SendGrid, etc.)
   - Set **From Email** to a valid sender (e.g. `notifications@yourdomain.com`)
   - To fields use `{{ $json.coach_email }}` and `{{ $json.client_email }}` (no change needed)
5. Activate the workflow (toggle Active in n8n)

### Verify

1. In ClearPath, go to Schedule → Ready to schedule
2. Pick a paid request, select a slot, confirm
3. Check n8n → Executions: workflow should have run
4. Coach and client should receive emails (check spam if needed)

### Troubleshooting

- **No execution in n8n:** Ensure `N8N_SESSION_BOOKED_WEBHOOK_URL` is set and workflow is Active
- **Emails not sent:** Check SMTP credentials on both Email nodes; verify `coach_email` and `client_email` in payload
- **502 from app:** App cannot reach n8n URL; check firewall, URL correctness

---

## 2. Google Drive Video → Library

When a video is uploaded to a Google Drive folder, n8n calls the app so the video appears in the coach's library.

### Setup Steps

1. Import [n8n/google-drive-video-workflow.json](../n8n/google-drive-video-workflow.json) into n8n
2. Set Google Drive credentials on the trigger node; select the folder to watch
3. In **POST to ClearPath** node:
   - URL: `https://YOUR_APP_URL/api/webhooks/n8n-video` (replace with your app domain, no trailing slash)
   - Header: `Authorization: Bearer YOUR_N8N_VIDEO_WEBHOOK_SECRET`
4. Set in app env:
   - `N8N_VIDEO_WEBHOOK_SECRET` (same value as in header)
   - `N8N_DEFAULT_COACH_ID` (coach UUID from `profiles.id`)
5. Activate the workflow

### Verify

1. Upload a video (e.g. MP4) to the configured Drive folder
2. Wait for n8n to run (trigger polls; may take up to a minute)
3. Check ClearPath → Coach → Videos: video should appear in library
4. Ensure Drive file is shared "Anyone with the link" so it embeds for clients

### Troubleshooting

- **Videos not appearing:** Check webhook URL, secret header, `N8N_DEFAULT_COACH_ID`
- **Embed fails:** Drive file must be shared "Anyone with the link"
- **403 from app:** Secret mismatch; verify `N8N_VIDEO_WEBHOOK_SECRET` matches exactly

---

## 3. Google Drive Video + CloudConvert (MOV→MP4) – Optional

Same as above, but converts MOV (and other formats) to MP4 via CloudConvert before adding to ClearPath.

### Setup Steps

1. Sign up at [cloudconvert.com](https://cloudconvert.com); create API key
2. Import [n8n/google-drive-video-cloudconvert-workflow.json](../n8n/google-drive-video-cloudconvert-workflow.json)
3. Replace `YOUR_CLOUDCONVERT_API_KEY` in CloudConvert nodes
4. Replace `YOUR_APP_URL` and `YOUR_N8N_VIDEO_WEBHOOK_SECRET` in POST to ClearPath node
5. Configure Google Drive credentials and folder
6. Activate the workflow

### Verify

1. Upload a MOV file to the Drive folder
2. Wait for conversion and workflow completion
3. MP4 should appear in ClearPath Videos library (converted file)

---

## 4. Session Reminder (24h Before) – Optional

Sends reminder emails to coach and client for sessions in the next 24 hours.

### Setup Steps

1. Import [n8n/session-reminder-workflow.json](../n8n/session-reminder-workflow.json) into n8n
2. In **Fetch upcoming sessions** node:
   - Replace `YOUR_APP_URL` with your app domain (e.g. `https://app.yourdomain.com`)
   - Set Header `Authorization: Bearer YOUR_N8N_SESSION_REMINDER_SECRET` (or use n8n Header Auth credential)
3. Set in app env: `N8N_SESSION_REMINDER_SECRET` (same value as Bearer token)
4. Configure **Email coach** and **Email client** nodes with SMTP (same as session-booked)
5. Adjust schedule trigger (default: daily 6am)

### Verify

1. Create a confirmed session in the next 24 hours
2. Run workflow manually or wait for scheduled run
3. Coach and client should receive reminder emails

---

## Summary: Env Vars for Automations

| Variable | Required for | Notes |
|----------|--------------|-------|
| `N8N_SESSION_BOOKED_WEBHOOK_URL` | Session-booked emails | Your n8n webhook Production URL |
| `N8N_VIDEO_WEBHOOK_SECRET` | Video workflows | Shared secret for `/api/webhooks/n8n-video` |
| `N8N_DEFAULT_COACH_ID` | Video workflows (single coach) | Coach UUID when n8n omits `coach_id` |
| `N8N_SESSION_REMINDER_SECRET` | Session reminders | Bearer for `GET /api/sessions/upcoming` |

---

## References

- [n8n/README.md](../n8n/README.md) – Workflow overview and setup
- [docs/n8n-session-booked.md](n8n-session-booked.md) – Session-booked payload details
- [docs/n8n-google-drive-video.md](n8n-google-drive-video.md) – Video webhook details
