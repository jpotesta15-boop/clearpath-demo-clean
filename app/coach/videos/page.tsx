'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import { Input } from '@/components/ui/input'
import { getEmbedUrl } from '@/lib/video-embed'
import { GENERIC_FAILED } from '@/lib/safe-messages'

function getThumbnailUrl(url: string | null, thumbnailUrl: string | null): string | null {
  if (thumbnailUrl) return thumbnailUrl
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://img.youtube.com/vi/${u.searchParams.get('v')}/mqdefault.jpg`
    }
    if (u.hostname === 'youtu.be' && u.pathname.slice(1)) {
      return `https://img.youtube.com/vi/${u.pathname.slice(1)}/mqdefault.jpg`
    }
    if (u.hostname.includes('drive.google.com')) {
      const pathMatch = u.pathname.match(/\/file\/d\/([^/]+)/)
      const idFromPath = pathMatch?.[1]
      const idFromQuery = u.searchParams.get('id')
      const fileId = idFromPath || idFromQuery
      if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w640-h360`
      }
    }
  } catch {
    // ignore
  }
  return null
}

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([])
  const [clients, setClients] = useState<{ id: string; full_name: string; email?: string | null }[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<any>(null)
  const [editingVideo, setEditingVideo] = useState<{ title: string; description: string; thumbnail_url: string }>({ title: '', description: '', thumbnail_url: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([])
  const [initialAssignedClientIds, setInitialAssignedClientIds] = useState<string[]>([])
  const [pendingAssignedClientIds, setPendingAssignedClientIds] = useState<string[]>([])
  const [savingAssignments, setSavingAssignments] = useState(false)
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null)
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null)
  const [newVideo, setNewVideo] = useState({ title: '', description: '', url: '', category: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterProgramId, setFilterProgramId] = useState('')
  const [filterClientId, setFilterClientId] = useState('')
  const [videoProgramIds, setVideoProgramIds] = useState<Record<string, string[]>>({})
  const [videoClientIds, setVideoClientIds] = useState<Record<string, string[]>>({})
  const supabase = createClient()
  const tenantId = process.env.NEXT_PUBLIC_CLIENT_ID ?? 'demo'

  useEffect(() => {
    loadVideos()
    loadClients()
    loadPrograms()
  }, [])

  useEffect(() => {
    if (selectedVideo?.id) {
      loadAssignments(selectedVideo.id)
      loadVideoPrograms(selectedVideo.id)
      setEditingVideo({
        title: selectedVideo.title ?? '',
        description: selectedVideo.description ?? '',
        thumbnail_url: selectedVideo.thumbnail_url ?? '',
      })
    } else {
      setAssignedClientIds([])
      setInitialAssignedClientIds([])
      setPendingAssignedClientIds([])
      setSelectedProgramIds([])
    }
  }, [selectedVideo?.id, selectedVideo?.title, selectedVideo?.description, selectedVideo?.thumbnail_url])

  const loadClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('coach_id', user.id)
      .order('full_name')
    setClients(data || [])
  }

  const loadPrograms = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('programs')
      .select('id, name')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })
    setPrograms(data || [])
  }

  const loadAssignments = async (videoId: string) => {
    const { data } = await supabase
      .from('video_assignments')
      .select('client_id')
      .eq('video_id', videoId)
    const ids = (data || []).map((r: any) => r.client_id as string)
    setAssignedClientIds(ids)
    setInitialAssignedClientIds(ids)
    setPendingAssignedClientIds(ids)
  }

  const loadVideoPrograms = async (videoId: string) => {
    const { data } = await supabase
      .from('program_lessons')
      .select('program_id')
      .eq('video_id', videoId)
    const ids = Array.from(new Set((data || []).map((r: any) => r.program_id).filter(Boolean)))
    setSelectedProgramIds(ids as string[])
  }

  const loadVideos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('coach_id', user.id)
      .eq('client_id', tenantId)
      .order('created_at', { ascending: false })

    setVideos(data || [])

    const videoIds = (data || []).map((v: any) => v.id)
    if (videoIds.length > 0) {
      const [lessonsRes, assignmentsRes] = await Promise.all([
        supabase.from('program_lessons').select('program_id, video_id').in('video_id', videoIds),
        supabase.from('video_assignments').select('video_id, client_id').in('video_id', videoIds),
      ])
      const byVideoProgram: Record<string, string[]> = {}
      ;(lessonsRes.data || []).forEach((r: any) => {
        if (!r.video_id) return
        if (!byVideoProgram[r.video_id]) byVideoProgram[r.video_id] = []
        if (r.program_id && !byVideoProgram[r.video_id].includes(r.program_id)) {
          byVideoProgram[r.video_id].push(r.program_id)
        }
      })
      const byVideoClient: Record<string, string[]> = {}
      ;(assignmentsRes.data || []).forEach((r: any) => {
        if (!byVideoClient[r.video_id]) byVideoClient[r.video_id] = []
        if (r.client_id && !byVideoClient[r.video_id].includes(r.client_id)) {
          byVideoClient[r.video_id].push(r.client_id)
        }
      })
      setVideoProgramIds(byVideoProgram)
      setVideoClientIds(byVideoClient)
    } else {
      setVideoProgramIds({})
      setVideoClientIds({})
    }
    setLoading(false)
  }

  const toggleClientSelection = (clientId: string) => {
    setPendingAssignedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    )
  }

  const saveClientAssignments = async () => {
    if (!selectedVideo?.id) return
    setError(null)
    setSavingAssignments(true)
    try {
      const toAdd = pendingAssignedClientIds.filter((id) => !initialAssignedClientIds.includes(id))
      const toRemove = initialAssignedClientIds.filter((id) => !pendingAssignedClientIds.includes(id))

      if (toRemove.length > 0) {
        const { error: delError } = await supabase
          .from('video_assignments')
          .delete()
          .eq('video_id', selectedVideo.id)
          .in('client_id', toRemove)
        if (delError) {
          setError(GENERIC_FAILED)
          setSavingAssignments(false)
          return
        }
      }

      if (toAdd.length > 0) {
        const rows = toAdd.map((clientId) => ({ video_id: selectedVideo.id, client_id: clientId }))
        const { error: insError } = await supabase.from('video_assignments').insert(rows)
        if (insError) {
          setError(insError.message)
          setSavingAssignments(false)
          return
        }
      }

      setAssignedClientIds(pendingAssignedClientIds)
      setInitialAssignedClientIds(pendingAssignedClientIds)
    } finally {
      setSavingAssignments(false)
    }
  }

  const toggleProgramMembership = async (programId: string) => {
    if (!selectedVideo?.id) return
    setError(null)
    const isSelected = selectedProgramIds.includes(programId)
    try {
      if (isSelected) {
        const { error: err } = await supabase
          .from('program_lessons')
          .delete()
          .eq('program_id', programId)
          .eq('video_id', selectedVideo.id)
        if (err) {
          setError(GENERIC_FAILED)
        } else {
          setSelectedProgramIds((prev) => prev.filter((id) => id !== programId))
        }
      } else {
        // Determine next sort order within the program
        const { data: existing } = await supabase
          .from('program_lessons')
          .select('sort_order')
          .eq('program_id', programId)
        const nextSort =
          existing && existing.length > 0
            ? Math.max(...existing.map((r: any) => r.sort_order ?? 0)) + 1
            : 0
        const { error: err } = await supabase.from('program_lessons').insert({
          program_id: programId,
          lesson_type: 'video',
          video_id: selectedVideo.id,
          sort_order: nextSort,
        })
        if (err) {
          setError(GENERIC_FAILED)
        } else {
          setSelectedProgramIds((prev) => (prev.includes(programId) ? prev : [...prev, programId]))
        }
      }
    } catch (e: any) {
      setError(GENERIC_FAILED)
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Delete this video? This will also remove it from any assigned clients.')) return
    setError(null)
    setDeletingVideoId(videoId)
    try {
      // Remove assignments first to avoid orphaned rows if FK is not cascading
      await supabase.from('video_assignments').delete().eq('video_id', videoId)
      const { error: err } = await supabase.from('videos').delete().eq('id', videoId)
      if (err) {
        setError(GENERIC_FAILED)
      } else {
        setVideos((prev) => prev.filter((v) => v.id !== videoId))
        if (selectedVideo?.id === videoId) {
          setSelectedVideo(null)
          setAssignedClientIds([])
        }
      }
    } finally {
      setDeletingVideoId(null)
    }
  }

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setError(null)
    const { error: err } = await supabase
      .from('videos')
      .insert({
        coach_id: user.id,
        client_id: tenantId,
        ...newVideo,
      })

    if (!err) {
      setShowForm(false)
      setNewVideo({ title: '', description: '', url: '', category: '' })
      loadVideos()
    } else {
      setError(GENERIC_FAILED)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVideo?.id) return
    setSavingEdit(true)
    setError(null)
    const { error: err } = await supabase
      .from('videos')
      .update({
        title: editingVideo.title.trim() || selectedVideo.title,
        description: editingVideo.description.trim() || null,
        thumbnail_url: editingVideo.thumbnail_url.trim() || null,
      })
      .eq('id', selectedVideo.id)
    if (!err) {
      setSelectedVideo((prev: any) => prev ? { ...prev, ...editingVideo } : null)
      loadVideos()
    } else {
      setError(GENERIC_FAILED)
    }
    setSavingEdit(false)
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md bg-[var(--cp-accent-danger)]/10 border border-[var(--cp-accent-danger)]/30 px-4 py-2 text-sm text-[var(--cp-accent-danger)]">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Video Library</h1>
          <p className="mt-1 text-sm text-[var(--cp-text-muted)]">Manage your training videos. Paste a link to add a video, then assign it to clients below or from the video modal.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Video'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]">
          <CardHeader>
            <CardTitle className="text-[var(--cp-text-primary)]">Add New Video</CardTitle>
            <p className="text-sm font-normal text-[var(--cp-text-muted)] mt-1">Add from link — paste a URL to add to your library</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Title</label>
                <Input
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  required
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Description</label>
                <textarea
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-[var(--cp-text-primary)]"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Video URL</label>
                <p className="text-xs text-[var(--cp-text-muted)] mt-0.5 mb-1">YouTube, Vimeo, or a shareable link (e.g. Google Drive)</p>
                <Input
                  value={newVideo.url}
                  onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                  placeholder="https://..."
                  required
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Category</label>
                <Input
                  value={newVideo.category}
                  onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                  placeholder="e.g., Technique, Warm-up"
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                />
              </div>
              <Button type="submit">Add Video</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(() => {
        const q = searchQuery.trim().toLowerCase()
        const filteredVideos = videos.filter((video: any) => {
          if (q) {
            const title = (video.title ?? '').toLowerCase()
            const desc = (video.description ?? '').toLowerCase()
            const cat = (video.category ?? '').toLowerCase()
            if (!title.includes(q) && !desc.includes(q) && !cat.includes(q)) return false
          }
          if (filterCategory && (video.category ?? '') !== filterCategory) return false
          if (filterProgramId && !(videoProgramIds[video.id] ?? []).includes(filterProgramId)) return false
          if (filterClientId && !(videoClientIds[video.id] ?? []).includes(filterClientId)) return false
          return true
        })
        const categories = Array.from(new Set(videos.map((v: any) => v.category).filter(Boolean))) as string[]

        return (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Input
                type="search"
                placeholder="Search by title, description, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={filterProgramId}
                onChange={(e) => setFilterProgramId(e.target.value)}
                className="h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
              >
                <option value="">All programs</option>
                {programs.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={filterClientId}
                onChange={(e) => setFilterClientId(e.target.value)}
                className="h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
              >
                <option value="">All clients</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.full_name ?? c.email ?? 'Unnamed'}</option>
                ))}
              </select>
            </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video: any) => {
          const thumb = getThumbnailUrl(video.url, video.thumbnail_url)
          return (
            <Card
              key={video.id}
              className="cursor-pointer hover:shadow-[var(--cp-shadow-card)] transition-shadow overflow-hidden border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="aspect-video bg-[var(--cp-bg-subtle)] relative">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--cp-text-muted)]">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-[var(--cp-text-primary)]">{video.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {video.category && (
                  <p className="text-sm text-[var(--cp-accent-primary)] mb-2">{video.category}</p>
                )}
                {video.description && (
                  <p className="text-sm text-[var(--cp-text-muted)] mb-4 line-clamp-2">{video.description}</p>
                )}
                <span className="text-[var(--cp-accent-primary)] hover:underline text-sm font-medium">
                  Watch Video →
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>
          </>
        )
      })()}

      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--cp-bg-backdrop)] p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] shadow-[var(--cp-shadow-card)] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cp-border-subtle)] shrink-0">
              <h3 className="text-lg font-semibold text-[var(--cp-text-primary)] truncate pr-4">{selectedVideo.title}</h3>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[var(--cp-accent-danger)]/50 text-[var(--cp-accent-danger)] hover:bg-[var(--cp-accent-danger)]/10"
                  onClick={() => handleDeleteVideo(selectedVideo.id)}
                  disabled={deletingVideoId === selectedVideo.id}
                >
                  {deletingVideoId === selectedVideo.id ? 'Deleting…' : 'Delete'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVideo(null)}
                  className="text-[var(--cp-text-muted)] hover:text-[var(--cp-text-primary)]"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
              <section>
                <h4 className="text-sm font-medium text-[var(--cp-text-muted)] mb-3">Watch</h4>
                {getEmbedUrl(selectedVideo.url) ? (
                  <div className="relative w-full aspect-video bg-[var(--cp-bg-subtle)] rounded-lg overflow-hidden">
                    <iframe
                      src={getEmbedUrl(selectedVideo.url)!}
                      title={selectedVideo.title}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-4 rounded-lg border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-subtle)]">
                    <p className="text-sm text-[var(--cp-text-muted)]">This video cannot be embedded. Open the link to watch.</p>
                    <a
                      href={selectedVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--cp-accent-primary)] hover:underline font-medium"
                    >
                      Open in new tab →
                    </a>
                  </div>
                )}
              </section>

              <section className="border-t border-[var(--cp-border-subtle)] pt-4">
                <h4 className="text-sm font-medium text-[var(--cp-text-primary)] mb-3">Edit title & description</h4>
                <form onSubmit={handleSaveEdit} className="space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--cp-text-muted)] mb-1">Title</label>
                    <Input
                      value={editingVideo.title}
                      onChange={(e) => setEditingVideo((p) => ({ ...p, title: e.target.value }))}
                      className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--cp-text-muted)] mb-1">Description</label>
                    <textarea
                      value={editingVideo.description}
                      onChange={(e) => setEditingVideo((p) => ({ ...p, description: e.target.value }))}
                      className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
                      rows={2}
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={savingEdit}>
                    {savingEdit ? 'Saving...' : 'Save changes'}
                  </Button>
                </form>
              </section>

              <section className="border-t border-[var(--cp-border-subtle)] pt-4">
                <h4 className="text-sm font-medium text-[var(--cp-text-primary)] mb-2">Assign to clients</h4>
                {assignedClientIds.length > 0 && (
                  <p className="text-xs text-[var(--cp-text-muted)] mb-2">
                    Assigned to:{' '}
                    {assignedClientIds
                      .map((id) => clients.find((c) => c.id === id)?.full_name || clients.find((c) => c.id === id)?.email || '—')
                      .filter((s) => s !== '—')
                      .join(', ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {clients.map((client) => {
                    const isSelected = pendingAssignedClientIds.includes(client.id)
                    return (
                      <label
                        key={client.id}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                          isSelected
                            ? 'bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] border-[var(--cp-accent-primary)]'
                            : 'border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] text-[var(--cp-text-primary)] hover:bg-[var(--cp-bg-subtle)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleClientSelection(client.id)}
                          className="sr-only"
                        />
                        <span>{client.full_name?.trim() || client.email || 'Unnamed'}</span>
                      </label>
                    )
                  })}
                  {clients.length === 0 && (
                    <p className="text-xs text-[var(--cp-text-muted)]">No clients found. Add clients to assign this video.</p>
                  )}
                </div>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={saveClientAssignments}
                    disabled={
                      savingAssignments ||
                      JSON.stringify(pendingAssignedClientIds) === JSON.stringify(initialAssignedClientIds)
                    }
                  >
                    {savingAssignments ? 'Saving…' : 'Save assignments'}
                  </Button>
                </div>
              </section>

              <section className="border-t border-[var(--cp-border-subtle)] pt-4">
                <h4 className="text-sm font-medium text-[var(--cp-text-primary)] mb-2">Add to programs</h4>
                {selectedProgramIds.length > 0 && (
                  <p className="text-xs text-[var(--cp-text-muted)] mb-2">
                    In:{' '}
                    {selectedProgramIds
                      .map((id) => programs.find((p) => p.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {programs.map((program) => {
                    const isSelected = selectedProgramIds.includes(program.id)
                    return (
                      <Button
                        key={program.id}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className={isSelected ? '' : 'border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]'}
                        onClick={() => toggleProgramMembership(program.id)}
                      >
                        {program.name}
                      </Button>
                    )
                  })}
                  {programs.length === 0 && (
                    <p className="text-xs text-[var(--cp-text-muted)]">No programs yet. Create a program to attach this video.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

