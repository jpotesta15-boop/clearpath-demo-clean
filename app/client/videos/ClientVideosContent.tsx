'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { getEmbedUrl } from '@/lib/video-embed'
import { createClient } from '@/lib/supabase/client'

type VideoAssignment = {
  id: string
  video_id?: string
  videos: {
    id: string
    title: string | null
    description: string | null
    url: string | null
    category: string | null
  } | null
}

export function ClientVideosContent({
  clientId,
  assignments,
  completedVideoIds: initialCompleted,
}: {
  clientId: string
  assignments: VideoAssignment[]
  completedVideoIds: string[]
}) {
  const [selectedAssignment, setSelectedAssignment] = useState<VideoAssignment | null>(null)
  const [completedVideoIds, setCompletedVideoIds] = useState<Set<string>>(new Set(initialCompleted))
  const [markingId, setMarkingId] = useState<string | null>(null)
  const supabase = createClient()

  const handleMarkDone = async (videoId: string) => {
    if (markingId) return
    setMarkingId(videoId)
    const { error } = await supabase.from('video_completions').upsert(
      { client_id: clientId, video_id: videoId },
      { onConflict: 'client_id,video_id' }
    )
    if (!error) setCompletedVideoIds((s) => new Set([...s, videoId]))
    setMarkingId(null)
  }

  const videos = assignments?.filter((a: VideoAssignment) => a.videos) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">My Videos</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">Assigned training videos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.length > 0 ? (
          videos.map((assignment: VideoAssignment) => {
            const video = assignment.videos!
            const embedSrc = video?.url ? getEmbedUrl(video.url) : null
            return (
              <Card
                key={assignment.id}
                className="cursor-pointer hover:shadow-[var(--cp-shadow-card)] transition-shadow border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]"
                onClick={() => setSelectedAssignment(assignment)}
              >
                <CardHeader className="relative">
                  {video?.id && completedVideoIds.has(video.id) && (
                    <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-[var(--cp-accent-success)]/20 px-2 py-0.5 text-xs font-medium text-[var(--cp-accent-success)]">
                      Done
                    </span>
                  )}
                  <CardTitle className="text-[var(--cp-text-primary)] pr-16">{video?.title ?? 'Video'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {embedSrc ? (
                    <div className="relative w-full aspect-video bg-[var(--cp-bg-subtle)] rounded-lg overflow-hidden">
                      <iframe
                        src={embedSrc}
                        title={video?.title ?? 'Video'}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-[var(--cp-bg-subtle)] rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium text-[var(--cp-accent-primary)]">Watch Video →</span>
                    </div>
                  )}
                  {video?.category && (
                    <p className="text-sm text-[var(--cp-accent-primary)]">{video.category}</p>
                  )}
                  {video?.description && (
                    <p className="text-sm text-[var(--cp-text-muted)] line-clamp-2">{video.description}</p>
                  )}
                </CardContent>
              </Card>
            )
          })
        ) : (
          <EmptyState
            title="No videos assigned yet"
            description="Your coach will assign videos here."
            className="col-span-full py-8"
          />
        )}
      </div>

      {selectedAssignment && selectedAssignment.videos && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--cp-bg-backdrop)] p-4"
          onClick={() => setSelectedAssignment(null)}
        >
          <div
            className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] shadow-[var(--cp-shadow-card)] max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cp-border-subtle)] shrink-0">
              <h3 className="text-lg font-semibold text-[var(--cp-text-primary)] truncate pr-4">
                {selectedAssignment.videos.title ?? 'Video'}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAssignment(null)}
                className="text-[var(--cp-text-muted)]"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
              {selectedAssignment.videos.url && getEmbedUrl(selectedAssignment.videos.url) ? (
                <div className="relative w-full aspect-video bg-[var(--cp-bg-subtle)] rounded-lg overflow-hidden">
                  <iframe
                    src={getEmbedUrl(selectedAssignment.videos.url)!}
                    title={selectedAssignment.videos.title ?? 'Video'}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : selectedAssignment.videos.url ? (
                <div className="rounded-lg border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-subtle)] p-6 text-center">
                  <p className="text-sm text-[var(--cp-text-muted)] mb-3">Open link to watch</p>
                  <a
                    href={selectedAssignment.videos.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--cp-accent-primary)] hover:underline font-medium"
                  >
                    Open in new tab →
                  </a>
                </div>
              ) : null}
              {selectedAssignment.videos.category && (
                <p className="text-sm text-[var(--cp-accent-primary)]">{selectedAssignment.videos.category}</p>
              )}
              {selectedAssignment.videos.description && (
                <p className="text-sm text-[var(--cp-text-muted)] whitespace-pre-wrap">
                  {selectedAssignment.videos.description}
                </p>
              )}
              {selectedAssignment.videos.id && (
                <div className="pt-2">
                  {completedVideoIds.has(selectedAssignment.videos.id) ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--cp-accent-success)] font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Done
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkDone(selectedAssignment.videos!.id)
                      }}
                      disabled={!!markingId}
                    >
                      {markingId === selectedAssignment.videos.id ? 'Saving...' : 'Mark done'}
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-[var(--cp-border-subtle)] shrink-0 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedAssignment(null)}>
                Back to library
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
