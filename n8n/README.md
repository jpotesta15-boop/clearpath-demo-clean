# n8n Workflows for ClearPath Coach OS

This folder contains ready-to-import n8n workflows for ClearPath automations. Import these into your n8n instance (cloud or self-hosted) to enable session confirmation emails and auto-add videos from Google Drive.

## Environment Variables (App)

Set these in your app environment (e.g. Vercel, `.env.local`):

| Variable | Required | Notes |
|----------|----------|-------|
| `N8N_VIDEO_WEBHOOK_SECRET` | If using video workflows | Shared secret for `/api/webhooks/n8n-video` |
| `N8N_DEFAULT_COACH_ID` | Optional | Coach UUID when n8n omits `coach_id` in video payload |
| `N8N_SESSION_BOOKED_WEBHOOK_URL` | If using session-booked | Your n8n webhook Production URL |

## Workflows

### 1. Session Booked – Email Coach and Client

**File:** `session-booked-workflow.json`

When a session is confirmed in ClearPath, the app forwards the event to your n8n webhook. This workflow sends email notifications to both the coach and the client.

**Setup:**
1. Import the workflow in n8n: **Workflows → Import from File** → select `session-booked-workflow.json`
2. Get the **Webhook** node's Production URL (e.g. `https://your-n8n.com/webhook/session-booked`)
3. Set in your app: `N8N_SESSION_BOOKED_WEBHOOK_URL=https://your-n8n.com/webhook/session-booked`
4. Configure **Email coach** and **Email client** nodes with SMTP (or Gmail/SendGrid) credentials
5. Set **From Email** to a valid sender (e.g. `notifications@yourdomain.com`)
6. Activate the workflow in n8n

**Payload fields from app:** `session_id`, `coach_id`, `client_id`, `scheduled_time`, `client_email`, `client_name`, `coach_name`, `coach_email`

---

### 2. Google Drive Video → ClearPath Library

**File:** `google-drive-video-workflow.json`

When a video file is uploaded to a Google Drive folder, n8n calls your app so the video appears in the coach's library.

**Setup:**
1. Import the workflow in n8n
2. Set Google Drive credentials for the trigger node
3. In **POST to ClearPath** node:
   - URL: `https://YOUR_APP_URL/api/webhooks/n8n-video` (replace with your app domain)
   - Header: `Authorization: Bearer YOUR_N8N_VIDEO_WEBHOOK_SECRET` (replace with your secret)
4. Set the Drive folder in the trigger
5. Activate the workflow

**App env:** `N8N_VIDEO_WEBHOOK_SECRET`, optional `N8N_DEFAULT_COACH_ID`

---

### 3. Google Drive Video + CloudConvert (MOV→MP4)

**File:** `google-drive-video-cloudconvert-workflow.json`

Same as above, but converts MOV (and other formats) to MP4 via CloudConvert before adding to ClearPath. Use this when Google Drive does not embed MOV files reliably.

**Setup:**
1. Sign up at [cloudconvert.com](https://cloudconvert.com), create an API key
2. Import the workflow
3. Replace `YOUR_CLOUDCONVERT_API_KEY` in CloudConvert nodes
4. Replace `YOUR_APP_URL` and `YOUR_N8N_VIDEO_WEBHOOK_SECRET` in POST to ClearPath node
5. Configure Google Drive credentials and folder
6. Activate the workflow

---

## Webhook URLs Reference

| App Endpoint | Auth | Purpose |
|--------------|------|---------|
| `POST /api/webhooks/n8n-video` | `Authorization: Bearer <N8N_VIDEO_WEBHOOK_SECRET>` or `x-n8n-secret` | Receives video metadata from n8n |
| App calls `N8N_SESSION_BOOKED_WEBHOOK_URL` | Session (coach) | App forwards session-booked event to n8n |

---

## Troubleshooting

- **Videos not appearing:** Check webhook URL (no trailing slash), secret header, and `N8N_DEFAULT_COACH_ID`. Ensure Drive files are shared "Anyone with the link".
- **Session emails not sent:** Ensure `N8N_SESSION_BOOKED_WEBHOOK_URL` is set, workflow is Active, and SMTP credentials are configured on both Email nodes.
- **CloudConvert errors:** Verify API key and that the Merge node passes binary from the Download node correctly.

For more detail, see `docs/n8n-session-booked.md` and `docs/n8n-google-drive-video.md`.
