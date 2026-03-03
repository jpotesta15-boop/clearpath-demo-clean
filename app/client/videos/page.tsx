import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getEmbedUrl } from '@/lib/video-embed'

export default async function ClientVideosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('email', user?.email)
    .single()

  if (!client) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-[var(--cp-text-primary)]">Client not found</h1>
        <p className="text-[var(--cp-text-muted)]">
          There is no client record for this account. Contact your coach to be added and to receive a portal invite.
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)]"
        >
          Back to login
        </a>
      </div>
    )
  }

  const { data: videos } = await supabase
    .from('video_assignments')
    .select('*, videos(*)')
    .eq('client_id', client.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Videos</h1>
        <p className="mt-1 text-sm text-gray-500">Assigned training videos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos && videos.length > 0 ? (
          videos.map((assignment: any) => {
            const video = assignment.videos
            const embedSrc = video?.url ? getEmbedUrl(video.url) : null
            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <CardTitle>{video?.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {embedSrc ? (
                    <div className="relative w-full aspect-video bg-gray-900 rounded overflow-hidden">
                      <iframe
                        src={embedSrc}
                        title={video?.title ?? 'Video'}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a
                      href={video?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-primary-600 hover:underline text-sm font-medium"
                    >
                      Watch Video →
                    </a>
                  )}
                  {video?.category && (
                    <p className="text-sm text-primary-600">{video.category}</p>
                  )}
                  {video?.description && (
                    <p className="text-sm text-gray-600">{video.description}</p>
                  )}
                  {embedSrc && video?.url && (
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Open in new tab →
                    </a>
                  )}
                </CardContent>
              </Card>
            )
          })
        ) : (
          <p className="text-gray-500">No videos assigned yet</p>
        )}
      </div>
    </div>
  )
}

