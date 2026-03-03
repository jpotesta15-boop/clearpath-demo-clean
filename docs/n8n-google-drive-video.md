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

## Converting MOV to MP4 (CloudConvert)

Google Drive often does not embed MOV files reliably in the client video player. You can convert MOV (or other formats) to MP4 in n8n using **CloudConvert**, then re-upload the MP4 to Drive and send that link to the app. The webhook and app are unchanged; you simply send the **MP4** Drive URL instead of the original file URL.

**Flow:** Drive trigger → download file → CloudConvert job (MOV → MP4) → wait for result → download MP4 → upload MP4 to Drive → POST to ClearPath with the new Drive link.

1. **CloudConvert setup:** Sign up at [cloudconvert.com](https://cloudconvert.com), go to **API**, create an API key. Store it in n8n credentials (e.g. Header Auth).
2. **Workflow:** Use the CloudConvert workflow described below. Steps: Google Drive trigger → (optional) filter for video mime types → Google Drive Download → HTTP Create CloudConvert job → HTTP Upload file to CloudConvert → Wait + poll job until finished → HTTP Get output URL → HTTP Download MP4 binary → Google Drive Upload (new file) → POST to `/api/webhooks/n8n-video` with `url` = the **new** Drive link to the MP4 (e.g. `https://drive.google.com/file/d/{{ newFileId }}/view`).
3. **Sharing:** After uploading the MP4 to Drive, ensure the new file is shared “Anyone with the link” so the embed works on the client Videos page.

A ready-to-import workflow with placeholder nodes for CloudConvert and Drive upload is at `docs/n8n-google-drive-video-cloudconvert-workflow.json`. After importing:

1. Set **CloudConvert API key** in the "CloudConvert Create Job" and "CloudConvert Wait" nodes (or use n8n credentials).
2. In **CloudConvert Upload**, add multipart form parameters from the Create Job response: from the import task use `result.form.parameters` (e.g. `expires`, `signature`, `max_file_count`, `max_file_size`) as body parameters with values from `$('CloudConvert Create Job').item.json.data.tasks.find(t => t.operation === 'import/upload').result.form.parameters.<key>`. Set the file field to use binary property `data` (from Download).
3. Set **webhook URL** and **webhook secret** in "POST to ClearPath".
4. Set the **Drive folder** in the trigger and ensure the Merge node passes binary from the Download node.
5. Run Tests 1–2 from the plan to verify.

**Testing:** Use Test 1 (webhook with direct MP4 link) and Test 2 (full flow with a small MOV) from the CloudConvert plan. Confirm the new video appears in the coach library with the MP4 Drive link and embeds on the client Videos page.

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
