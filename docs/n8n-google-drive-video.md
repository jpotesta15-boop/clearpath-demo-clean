# n8n + Google Drive: auto-add videos to library

When a video file is uploaded to a Google Drive folder, n8n can call your app so the video appears in the coach’s library.

## App setup

1. **Environment variables** (in `.env.local` or your host):
   - `N8N_VIDEO_WEBHOOK_SECRET` – shared secret (e.g. a long random string). n8n will send this in the request; the API rejects requests without it.
   - `N8N_DEFAULT_COACH_ID` – (optional) UUID of the coach to own the video. If you have one coach per deployment, set this so the webhook body doesn’t need to include `coach_id`.
   - `NEXT_PUBLIC_CLIENT_ID` – tenant id (already used elsewhere). The video is stored with this as `client_id` (tenant).

2. **API endpoint**: `POST /api/webhooks/n8n-video`
   - **Auth:** `Authorization: Bearer <N8N_VIDEO_WEBHOOK_SECRET>` or header `x-n8n-secret: <N8N_VIDEO_WEBHOOK_SECRET>`.
   - **Body (JSON):**
     - `title` (required)
     - `url` (required) – shareable link to the video (e.g. Google Drive “Get link” view URL).
     - `description` (optional)
     - `category` (optional)
     - `coach_id` (optional) – if not set, `N8N_DEFAULT_COACH_ID` is used.

3. **Supabase:** The route uses the **service role** key (`SUPABASE_SERVICE_ROLE_KEY`) to insert into `videos`, so the request does not need a user session.

## Getting a shareable link in n8n (Google Drive)

- **Trigger:** Use the Google Drive node “Watch for new/updated files” (or “On file created”) on the folder you want.
- **File link:** The Drive node often returns a `webViewLink` or `id`. Build the shareable URL as:
  - `https://drive.google.com/file/d/{{ $json.id }}/view`
  - Or use the “Share” / “Get link” style URL your Drive node provides (e.g. `webViewLink` if available).
- Ensure the file is shared so that “Anyone with the link” can view (or your app’s service account has access), otherwise the client may not be able to open the link.

## n8n workflow outline

1. **Trigger:** Google Drive – “Watch for new files” (or “On file created”) on the chosen folder.
2. **Process:** (Optional) Set title from file name, description from metadata, etc.
3. **HTTP Request:**
   - Method: POST
   - URL: `https://<your-app-domain>/api/webhooks/n8n-video`
   - Authentication: None (we use a header).
   - Headers: `Authorization: Bearer <your N8N_VIDEO_WEBHOOK_SECRET>` or `x-n8n-secret: <your N8N_VIDEO_WEBHOOK_SECRET>`.
   - Body (JSON):
     ```json
     {
       "title": "{{ $json.name }}",
       "url": "https://drive.google.com/file/d/{{ $json.id }}/view",
       "description": "From Google Drive",
       "category": "Uploaded"
     }
     ```

## Importing the workflow

A JSON workflow file is provided at `docs/n8n-google-drive-video-workflow.json`. In n8n: **Workflows → Import from File** (or paste JSON). Then:

1. Set your Google Drive credentials for the trigger node.
2. Set the webhook URL to your app (e.g. `https://your-site.com/api/webhooks/n8n-video`).
3. Add a credential or expression for the secret and use it in the HTTP Request node header.

## Demo note

For a single-coach demo, set `N8N_DEFAULT_COACH_ID` to that coach’s user UUID (from `profiles.id`) and leave `coach_id` out of the body. The video will appear in that coach’s library under the tenant given by `NEXT_PUBLIC_CLIENT_ID`.

## Troubleshooting checklist

Use this checklist when videos from Google Drive are not appearing or not embedding correctly.

1. **Webhook URL**  
   In the n8n HTTP Request node, the URL must be your app’s full URL, e.g. `https://<your-vercel-domain>/api/webhooks/n8n-video`. No trailing slash.

2. **Webhook secret**  
   The request must include the secret: header `Authorization: Bearer <N8N_VIDEO_WEBHOOK_SECRET>` or `x-n8n-secret: <N8N_VIDEO_WEBHOOK_SECRET>`. The value must match exactly what is set in your app’s environment (e.g. Vercel env vars).

3. **Environment variables (production)**  
   On your host (e.g. Vercel), set:
   - `N8N_VIDEO_WEBHOOK_SECRET` – same value used in the n8n request header.
   - `N8N_DEFAULT_COACH_ID` – UUID of the coach who should own the video (`profiles.id`).
   - `NEXT_PUBLIC_CLIENT_ID` – tenant id so the video is stored for the correct tenant.

4. **Google Drive sharing**  
   The Drive file must be shared so that “Anyone with the link” can view (or the same identity that loads the app). Otherwise the embedded player will show a permission error on the coach and client video pages.

5. **Where videos appear**  
   After a successful webhook call, the video appears in the **coach** Videos library (coach dashboard → Videos). Assign it to a client to have it show on the **client** Videos page; supported URLs (YouTube, Vimeo, Google Drive) are shown embedded in the page.
