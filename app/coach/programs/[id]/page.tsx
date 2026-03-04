'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { reorderProgramLessonsAction } from './actions'

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

function lessonLabel(lesson: Lesson) {
  const video = Array.isArray(lesson.videos) ? lesson.videos[0] : lesson.videos
  if (lesson.lesson_type === 'video') return video?.title ?? 'Video'
  if (lesson.lesson_type === 'link' || lesson.lesson_type === 'image') return lesson.title || lesson.url || lesson.lesson_type
  if (lesson.lesson_type === 'note') return (lesson.content ?? '').slice(0, 40) + ((lesson.content?.length ?? 0) > 40 ? '…' : '')
  return video?.title ?? 'Lesson'
}

function SortableLessonRow({
  lesson,
  onRemove,
}: {
  lesson: Lesson
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex justify-between items-center gap-2 border-b border-[var(--cp-border-subtle)] pb-2 last:border-0 ${isDragging ? 'opacity-60 z-10' : ''}`}
    >
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <button
          type="button"
          className="touch-none cursor-grab active:cursor-grabbing p-1 rounded text-[var(--cp-text-muted)] hover:bg-[var(--cp-bg-subtle)]"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--cp-bg-subtle)] text-[var(--cp-text-muted)]">
          {lesson.lesson_type === 'video' && (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {lesson.lesson_type === 'link' && (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          )}
          {lesson.lesson_type === 'note' && (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          )}
          {(lesson.lesson_type === 'image' || !lesson.lesson_type) && (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
        </span>
        <span className="font-medium text-[var(--cp-text-primary)] truncate">{lessonLabel(lesson)}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-[var(--cp-accent-danger)] hover:bg-[var(--cp-accent-danger)]/10 shrink-0"
        onClick={() => onRemove(lesson.id)}
      >
        Remove
      </Button>
    </li>
  )
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
  const [reordering, setReordering] = useState(false)
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([])
  const [bulkAdding, setBulkAdding] = useState(false)
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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
      setSelectedVideoIds([])
      loadData()
    }
  }

  const handleBulkAddVideos = async () => {
    if (selectedVideoIds.length === 0) return
    setBulkAdding(true)
    let nextOrder = getNextSortOrder()
    for (const videoId of selectedVideoIds) {
      await supabase.from('program_lessons').insert({
        program_id: params.id,
        lesson_type: 'video',
        video_id: videoId,
        sort_order: nextOrder++,
      })
    }
    setBulkAdding(false)
    setAddingVideo(false)
    setSelectedVideoIds([])
    loadData()
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = lessons.findIndex((l) => l.id === active.id)
    const newIndex = lessons.findIndex((l) => l.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(lessons, oldIndex, newIndex)
    setLessons(reordered)
    setReordering(true)
    const err = await reorderProgramLessonsAction(
      params.id as string,
      reordered.map((l) => l.id)
    )
    setReordering(false)
    if (err.error) {
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

      <Card className="border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]">
        <CardHeader>
          <CardTitle className="text-[var(--cp-text-primary)]">Contents</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)] mt-1">
            Videos, links, notes, and images in this program.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {lessons.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                <ol className="list-none space-y-2 pl-0">
                  {lessons.map((lesson) => (
                    <SortableLessonRow key={lesson.id} lesson={lesson} onRemove={handleRemoveLesson} />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-[var(--cp-text-muted)]">No lessons yet. Add videos, links, notes, or images below.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--cp-border-subtle)]">
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
            <div className="pt-2 border-t border-[var(--cp-border-subtle)]">
              <p className="text-sm font-medium text-[var(--cp-text-primary)] mb-2">Choose video(s) to add</p>
              {availableVideos.length === 0 ? (
                <p className="text-[var(--cp-text-muted)] text-sm">No more videos in library, or add videos first.</p>
              ) : (
                <ul className="space-y-1 max-h-48 overflow-y-auto mb-2">
                  {availableVideos.map((video) => (
                    <li key={video.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`video-${video.id}`}
                        checked={selectedVideoIds.includes(video.id)}
                        onChange={() => {
                          setSelectedVideoIds((prev) =>
                            prev.includes(video.id) ? prev.filter((id) => id !== video.id) : [...prev, video.id]
                          )
                        }}
                        className="rounded border-[var(--cp-border-subtle)]"
                      />
                      <label htmlFor={`video-${video.id}`} className="text-sm text-[var(--cp-text-primary)] cursor-pointer flex-1">
                        {video.title}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkAddVideos}
                  disabled={selectedVideoIds.length === 0 || bulkAdding}
                >
                  {bulkAdding ? 'Adding…' : `Add selected (${selectedVideoIds.length})`}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setAddingVideo(false); setSelectedVideoIds([]) }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {addingLink && (
            <form onSubmit={handleAddLink} className="pt-2 border-t border-[var(--cp-border-subtle)] space-y-2">
              <Input
                placeholder="Link title"
                value={linkForm.title}
                onChange={(e) => setLinkForm((f) => ({ ...f, title: e.target.value }))}
                required
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
              />
              <Input
                placeholder="URL"
                type="url"
                value={linkForm.url}
                onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
                required
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingLink(false); setLinkForm({ title: '', url: '' }) }}>Cancel</Button>
              </div>
            </form>
          )}
          {addingNote && (
            <form onSubmit={handleAddNote} className="pt-2 border-t border-[var(--cp-border-subtle)] space-y-2">
              <textarea
                placeholder="Note content"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                required
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingNote(false); setNoteContent('') }}>Cancel</Button>
              </div>
            </form>
          )}
          {addingImage && (
            <form onSubmit={handleAddImage} className="pt-2 border-t border-[var(--cp-border-subtle)] space-y-2">
              <Input
                placeholder="Image title"
                value={imageForm.title}
                onChange={(e) => setImageForm((f) => ({ ...f, title: e.target.value }))}
                required
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
              />
              <Input
                placeholder="Image URL"
                type="url"
                value={imageForm.url}
                onChange={(e) => setImageForm((f) => ({ ...f, url: e.target.value }))}
                required
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm">Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingImage(false); setImageForm({ title: '', url: '' }) }}>Cancel</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]">
        <CardHeader>
          <CardTitle className="text-[var(--cp-text-primary)]">Who has access</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)] mt-1">
            Choose which clients can see this program.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {allClients.length > 0 && (
            <div className="flex gap-2 flex-wrap items-end">
              <div className="min-w-[200px] flex-1">
                <label className="block text-xs font-medium text-[var(--cp-text-muted)] mb-1">Add access</label>
                <select
                  value={assignClientId}
                  onChange={(e) => setAssignClientId(e.target.value)}
                  className="w-full h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                >
                  <option value="">Choose a client…</option>
                  {unassignedClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name?.trim() || client.email || 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                onClick={() => assignClientId && handleAssignClient(assignClientId)}
                disabled={!assignClientId}
              >
                Add access
              </Button>
            </div>
          )}
          {clients.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--cp-text-muted)]">Has access</p>
              <ul className="space-y-1">
                {clients.map((assignment: any) => (
                  <li
                    key={assignment.id}
                    className="flex justify-between items-center gap-2 py-2 border-b border-[var(--cp-border-subtle)] last:border-0 last:pb-0"
                  >
                    <span className="font-medium text-[var(--cp-text-primary)]">
                      {assignment.clients?.full_name?.trim() || assignment.clients?.email || 'Unnamed'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--cp-accent-danger)] hover:bg-[var(--cp-accent-danger)]/10 shrink-0"
                      onClick={async () => {
                        await supabase.from('program_assignments').delete().eq('id', assignment.id)
                        loadData()
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[var(--cp-text-muted)]">
              {allClients.length === 0
                ? 'Add clients in Clients first, then grant them access here.'
                : 'No clients have access yet. Use the dropdown above to add.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

