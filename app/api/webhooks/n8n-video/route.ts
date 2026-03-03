import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getClientId } from '@/lib/config'

const secret = process.env.N8N_VIDEO_WEBHOOK_SECRET
const MAX_TITLE_LENGTH = 500

function isValidUrl(s: string): boolean {
  if (!s || (!s.startsWith('http://') && !s.startsWith('https://'))) return false
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const headerSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.headers.get('x-n8n-secret')

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { title: string; url: string; description?: string; category?: string; coach_id?: string }
  try {
    body = await request.json()
  } catch (e) {
    console.error('[n8n-video] Invalid JSON:', e)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const titleRaw = typeof body.title === 'string' ? body.title.trim() : ''
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!titleRaw || !url) {
    return NextResponse.json({ error: 'title and url are required' }, { status: 400 })
  }

  if (!isValidUrl(url)) {
    const err = 'url must be a valid URL starting with http:// or https://'
    console.error('[n8n-video] Validation failed:', err, { url: url.slice(0, 80) })
    return NextResponse.json({ error: err }, { status: 400 })
  }

  const title = titleRaw.length > MAX_TITLE_LENGTH ? titleRaw.slice(0, MAX_TITLE_LENGTH) : titleRaw

  const coachId = body.coach_id?.trim() || process.env.N8N_DEFAULT_COACH_ID
  const tenantId = getClientId()
  if (!coachId) {
    return NextResponse.json(
      { error: 'coach_id required in body or set N8N_DEFAULT_COACH_ID' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('videos')
      .insert({
        coach_id: coachId,
        client_id: tenantId,
        title,
        url,
        description: typeof body.description === 'string' ? body.description.trim() || null : null,
        category: typeof body.category === 'string' ? body.category.trim() || null : null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[n8n-video] Insert failed:', error.message, { title: title.slice(0, 50), coachId })
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Insert failed'
    console.error('[n8n-video] Error:', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
