'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getEmbedUrl } from '@/lib/video-embed'

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
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<any>(null)
  const [editingVideo, setEditingVideo] = useState<{ title: string; description: string; thumbnail_url: string }>({ title: '', description: '', thumbnail_url: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([])
  const [assignClientId, setAssignClientId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [newVideo, setNewVideo] = useState({ title: '', description: '', url: '', category: '' })
  const supabase = createClient()
  const tenantId = process.env.NEXT_PUBLIC_CLIENT_ID ?? 'demo'

  useEffect(() => {
    loadVideos()
    loadClients()
  }, [])

  useEffect(() => {
    if (selectedVideo?.id) {
      loadAssignments(selectedVideo.id)
      setEditingVideo({
        title: selectedVideo.title ?? '',
        description: selectedVideo.description ?? '',
        thumbnail_url: selectedVideo.thumbnail_url ?? '',
      })
    } else {
      setAssignedClientIds([])
      setAssignClientId('')
    }
  }, [selectedVideo?.id, selectedVideo?.title, selectedVideo?.description, selectedVideo?.thumbnail_url])

  const loadClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('coach_id', user.id)
      .order('full_name')
    setClients(data || [])
  }

  const loadAssignments = async (videoId: string) => {
    const { data } = await supabase
      .from('video_assignments')
      .select('client_id')
      .eq('video_id', videoId)
    setAssignedClientIds((data || []).map((r: any) => r.client_id))
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
    setLoading(false)
  }

  const handleAssignToClient = async () => {
    if (!selectedVideo || !assignClientId) return
    setAssigning(true)
    setError(null)
    const { error: err } = await supabase.from('video_assignments').insert({
      video_id: selectedVideo.id,
      client_id: assignClientId,
    })
    if (err) {
      setError(err.message)
    } else {
      setAssignedClientIds((prev) => [...prev, assignClientId])
      setAssignClientId('')
    }
    setAssigning(false)
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
      setError(err.message)
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
      setError(err.message)
    }
    setSavingEdit(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Library</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your training videos. Paste a link to add a video, then assign it to clients below or from the video modal.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Video'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Video</CardTitle>
            <p className="text-sm font-normal text-gray-500 mt-1">Add from link — paste a URL to add to your library</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <Input
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Video URL</label>
                <p className="text-xs text-gray-500 mt-0.5 mb-1">YouTube, Vimeo, or a shareable link (e.g. Google Drive)</p>
                <Input
                  value={newVideo.url}
                  onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
                  placeholder="https://..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <Input
                  value={newVideo.category}
                  onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                  placeholder="e.g., Technique, Warm-up"
                />
              </div>
              <Button type="submit">Add Video</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const thumb = getThumbnailUrl(video.url, video.thumbnail_url)
          return (
            <Card
              key={video.id}
              className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="aspect-video bg-gray-100 relative">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <CardHeader>
                <CardTitle>{video.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {video.category && (
                  <p className="text-sm text-primary-600 mb-2">{video.category}</p>
                )}
                {video.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{video.description}</p>
                )}
                <span className="text-primary-600 hover:underline text-sm font-medium">
                  Watch Video →
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">{selectedVideo.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {getEmbedUrl(selectedVideo.url) ? (
                <div className="relative w-full aspect-video bg-gray-900 rounded overflow-hidden">
                  <iframe
                    src={getEmbedUrl(selectedVideo.url)!}
                    title={selectedVideo.title}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <p className="text-sm text-gray-600">This video cannot be embedded. Open the link to watch.</p>
                  <a
                    href={selectedVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline font-medium"
                  >
                    Open in new tab →
                  </a>
                </div>
              )}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Edit title & description</h4>
                <form onSubmit={handleSaveEdit} className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500">Title</label>
                    <Input
                      value={editingVideo.title}
                      onChange={(e) => setEditingVideo((p) => ({ ...p, title: e.target.value }))}
                      className="mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Description</label>
                    <textarea
                      value={editingVideo.description}
                      onChange={(e) => setEditingVideo((p) => ({ ...p, description: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mt-0.5"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Thumbnail URL (optional)</label>
                    <Input
                      value={editingVideo.thumbnail_url}
                      onChange={(e) => setEditingVideo((p) => ({ ...p, thumbnail_url: e.target.value }))}
                      placeholder="https://..."
                      className="mt-0.5"
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={savingEdit}>
                    {savingEdit ? 'Saving...' : 'Save changes'}
                  </Button>
                </form>
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-3 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Assign to client</h4>
              {assignedClientIds.length > 0 && (
                <p className="text-xs text-gray-500">
                  Assigned to: {assignedClientIds.map((id) => clients.find((c) => c.id === id)?.full_name).filter(Boolean).join(', ')}
                </p>
              )}
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={assignClientId}
                  onChange={(e) => setAssignClientId(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm min-w-[180px]"
                >
                  <option value="">Select client...</option>
                  {clients
                    .filter((c) => !assignedClientIds.includes(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAssignToClient}
                  disabled={!assignClientId || assigning}
                >
                  {assigning ? 'Adding...' : 'Assign'}
                </Button>
              </div>
              {clients.filter((c) => !assignedClientIds.includes(c.id)).length === 0 && clients.length > 0 && (
                <p className="text-xs text-gray-500">All clients are already assigned this video.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

