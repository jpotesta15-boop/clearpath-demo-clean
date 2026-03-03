'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

type Lesson = {
  id: string
  sort_order: number
  lesson_type?: string
  title?: string | null
  url?: string | null
  content?: string | null
  video_id?: string | null
  videos: { id: string; title: string; url?: string }[] | null
}

export default function ProgramDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [program, setProgram] = useState<any>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [libraryVideos, setLibraryVideos] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [allClients, setAllClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addingVideo, setAddingVideo] = useState(false)
  const [addingLink, setAddingLink] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [addingImage, setAddingImage] = useState(false)
  const [assignClientId, setAssignClientId] = useState('')
  const [linkForm, setLinkForm] = useState({ title: '', url: '' })
  const [noteContent, setNoteContent] = useState('')
  const [imageForm, setImageForm] = useState({ title: '', url: '' })
  const [editingProgram, setEditingProgram] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingProgram, setSavingProgram] = useState(false)
  const [deletingProgram, setDeletingProgram] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: programData } = await supabase
      .from('programs')
      .select('*')
      .eq('id', params.id)
      .eq('coach_id', user.id)
      .single()

    if (!programData) {
      setLoading(false)
      return
    }

    const { data: lessonsData } = await supabase
      .from('program_lessons')
      .select('id, sort_order, lesson_type, title, url, content, video_id, videos(id, title, url)')
      .eq('program_id', params.id)
      .order('sort_order', { ascending: true })

    const { data: videosData } = await supabase
      .from('videos')
      .select('id, title')
      .eq('coach_id', user.id)
      .order('title', { ascending: true })

    const { data: assignedClients } = await supabase
      .from('program_assignments')
      .select('*, clients(*)')
      .eq('program_id', params.id)

    const { data: allClientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('coach_id', user.id)

    setProgram(programData)
    setLessons(lessonsData || [])
    setLibraryVideos(videosData || [])
    setClients(assignedClients || [])
    setAllClients(allClientsData || [])
    setLoading(false)
  }

  const getNextSortOrder = () =>
    lessons.length === 0 ? 0 : Math.max(...lessons.map((l) => l.sort_order)) + 1

  const handleAddVideo = async (videoId: string) => {
    const { error } = await supabase.from('program_lessons').insert({
      program_id: params.id,
      lesson_type: 'video',
      video_id: videoId,
      sort_order: getNextSortOrder(),
    })
    if (!error) {
      setAddingVideo(false)
      loadData()
    }
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkForm.title.trim() || !linkForm.url.trim()) return
    const { error } = await supabase.from('program_lessons').insert({
      program_id: params.id,
      lesson_type: 'link',
      title: linkForm.title.trim(),
      url: linkForm.url.trim(),
      sort_order: getNextSortOrder(),
    })
    if (!error) {
      setAddingLink(false)
      setLinkForm({ title: '', url: '' })
      loadData()
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim()) return
    const { error } = await supabase.from('program_lessons').insert({
      program_id: params.id,
      lesson_type: 'note',
      content: noteContent.trim(),
      sort_order: getNextSortOrder(),
    })
    if (!error) {
      setAddingNote(false)
      setNoteContent('')
      loadData()
    }
  }

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageForm.title.trim() || !imageForm.url.trim()) return
    const { error } = await supabase.from('program_lessons').insert({
      program_id: params.id,
      lesson_type: 'image',
      title: imageForm.title.trim(),
      url: imageForm.url.trim(),
      sort_order: getNextSortOrder(),
    })
    if (!error) {
      setAddingImage(false)
      setImageForm({ title: '', url: '' })
      loadData()
    }
  }

  const handleRemoveLesson = async (lessonId: string) => {
    await supabase.from('program_lessons').delete().eq('id', lessonId)
    loadData()
  }

  const startEditProgram = () => {
    setEditName(program.name)
    setEditDescription(program.description ?? '')
    setEditingProgram(true)
  }

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!program?.id) return
    setSavingProgram(true)
    const { error } = await supabase
      .from('programs')
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', program.id)
    setSavingProgram(false)
    if (!error) {
      setProgram((p: any) => (p ? { ...p, name: editName.trim(), description: editDescription.trim() || null } : null))
      setEditingProgram(false)
    }
  }

  const handleDeleteProgram = async () => {
    if (!program?.id || !window.confirm('Delete this program? Assigned clients and all lessons will be removed.')) return
    setDeletingProgram(true)
    const { error } = await supabase.from('programs').delete().eq('id', program.id)
    setDeletingProgram(false)
    if (!error) router.push('/coach/programs')
  }

  const handleAssignClient = async (clientId: string) => {
    const { error } = await supabase.from('program_assignments').insert({
      program_id: params.id,
      client_id: clientId,
    })
    if (error) {
      loadData()
      return
    }
    for (const lesson of lessons) {
      if (lesson.video_id) {
        await supabase.from('video_assignments').insert({
          video_id: lesson.video_id,
          client_id: clientId,
        })
      }
    }
    setAssignClientId('')
    loadData()
  }

  if (loading) return <div className="p-4">Loading...</div>
  if (!program) return <div className="p-4">Program not found</div>

  const unassignedClients = allClients.filter(
    (client) => !clients.some((ac: any) => ac.client_id === client.id)
  )
  const videoIdsInProgram = new Set(lessons.map((l) => l.video_id).filter(Boolean))
  const availableVideos = libraryVideos.filter((v) => !videoIdsInProgram.has(v.id))

  const lessonLabel = (lesson: Lesson) => {
    const video = Array.isArray(lesson.videos) ? lesson.videos[0] : lesson.videos
    if (lesson.lesson_type === 'video') return video?.title ?? 'Video'
    if (lesson.lesson_type === 'link' || lesson.lesson_type === 'image') return lesson.title || lesson.url || lesson.lesson_type
    if (lesson.lesson_type === 'note') return (lesson.content ?? '').slice(0, 40) + ((lesson.content?.length ?? 0) > 40 ? '…' : '')
    return video?.title ?? 'Lesson'
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/coach/programs"
          className="inline-block text-sm font-medium text-[var(--cp-accent-primary)] hover:underline mb-2"
        >
          ← Back to Programs
        </Link>
        {!editingProgram ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">{program.name}</h1>
                {program.description && (
                  <p className="mt-2 text-[var(--cp-text-muted)]">{program.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={startEditProgram}>
                  Edit program
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[var(--cp-accent-danger)] text-[var(--cp-accent-danger)] hover:bg-[var(--cp-accent-danger)]/10"
                  onClick={handleDeleteProgram}
                  disabled={deletingProgram}
                >
                  {deletingProgram ? 'Deleting…' : 'Delete program'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleSaveProgram} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="mt-1 bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-[var(--cp-text-primary)]"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingProgram}>
                {savingProgram ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingProgram(false)} disabled={savingProgram}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson blocks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lessons.length > 0 ? (
            <ol className="list-decimal list-inside space-y-2">
              {lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex justify-between items-center gap-2 border-b border-gray-100 pb-2 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 mr-2">
                      {lesson.lesson_type ?? 'video'}
                    </span>
                    <span className="font-medium truncate">{lessonLabel(lesson)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 shrink-0"
                    onClick={() => handleRemoveLesson(lesson.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-gray-500">No lessons yet. Add videos, links, notes, or images.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {!addingVideo && (
              <Button onClick={() => setAddingVideo(true)} variant="outline" size="sm">
                Add video
              </Button>
            )}
            {!addingLink && (
              <Button onClick={() => setAddingLink(true)} variant="outline" size="sm">
                Add link
              </Button>
            )}
            {!addingNote && (
              <Button onClick={() => setAddingNote(true)} variant="outline" size="sm">
                Add note
              </Button>
            )}
            {!addingImage && (
              <Button onClick={() => setAddingImage(true)} variant="outline" size="sm">
                Add image
              </Button>
            )}
          </div>
          {addingVideo && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Choose a video</p>
              <div className="flex flex-wrap gap-2">
                {availableVideos.length === 0 ? (
                  <p className="text-gray-500 text-sm">No more videos in library, or add videos first.</p>
                ) : (
                  availableVideos.map((video) => (
                    <Button
                      key={video.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddVideo(video.id)}
                    >
                      {video.title}
                    </Button>
                  ))
                )}
                <Button variant="ghost" size="sm" onClick={() => setAddingVideo(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {addingLink && (
            <form onSubmit={handleAddLink} className="pt-2 border-t space-y-2">
              <Input
                placeholder="Link title"
                value={linkForm.title}
                onChange={(e) => setLinkForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <Input
                placeholder="URL"
                type="url"
                value={linkForm.url}
                onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingLink(false); setLinkForm({ title: '', url: '' }) }}>Cancel</Button>
              </div>
            </form>
          )}
          {addingNote && (
            <form onSubmit={handleAddNote} className="pt-2 border-t space-y-2">
              <textarea
                placeholder="Note content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[80px]"
                required
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingNote(false); setNoteContent('') }}>Cancel</Button>
              </div>
            </form>
          )}
          {addingImage && (
            <form onSubmit={handleAddImage} className="pt-2 border-t space-y-2">
              <Input
                placeholder="Image title"
                value={imageForm.title}
                onChange={(e) => setImageForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <Input
                placeholder="Image URL"
                type="url"
                value={imageForm.url}
                onChange={(e) => setImageForm((f) => ({ ...f, url: e.target.value }))}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingImage(false); setImageForm({ title: '', url: '' }) }}>Cancel</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length > 0 ? (
            <div className="space-y-2">
              {clients.map((assignment: any) => (
                <div
                  key={assignment.id}
                  className="flex justify-between items-center border-b pb-2 last:border-0"
                >
                  <p className="font-medium">{assignment.clients?.full_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No clients assigned</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign to Client</CardTitle>
        </CardHeader>
        <CardContent>
          {unassignedClients.length > 0 ? (
            <div className="flex gap-2 flex-wrap items-end">
              <div className="min-w-[200px] flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Select client</label>
                <select
                  value={assignClientId}
                  onChange={(e) => setAssignClientId(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Choose…</option>
                  {unassignedClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                onClick={() => assignClientId && handleAssignClient(assignClientId)}
                disabled={!assignClientId}
              >
                Assign
              </Button>
            </div>
          ) : (
            <p className="text-gray-500">All clients are assigned to this program, or you have no clients yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

