import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getClientId } from '@/lib/config'
import { n8nVideoSchema } from '@/lib/validations'
import { getSafeMessage, logServerError } from '@/lib/api-error'

const secret = process.env.N8N_VIDEO_WEBHOOK_SECRET

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const headerSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.headers.get('x-n8n-secret')

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (e) {
    console.error('[n8n-video] Invalid JSON:', e)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = n8nVideoSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const { title, url, description, category, coach_id } = parsed.data
  const coachId = coach_id ?? process.env.N8N_DEFAULT_COACH_ID
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
        description: description ?? null,
        category: category ?? null,
      })
      .select('id')
      .single()

    if (error) {
      logServerError('n8n-video', error, { title: title.slice(0, 30), coachId })
      return NextResponse.json({ error: getSafeMessage(400) }, { status: 400 })
    }
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (err) {
    logServerError('n8n-video', err)
    return NextResponse.json({ error: getSafeMessage(500) }, { status: 500 })
  }
}
