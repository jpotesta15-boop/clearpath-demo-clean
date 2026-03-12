'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Loading } from '@/components/ui/loading'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function ProgramsPage() {
  const router = useRouter()
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newProgram, setNewProgram] = useState({ name: '', description: '' })
  const [editingProgram, setEditingProgram] = useState<{ id: string; name: string; description: string } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadPrograms()
  }, [])

  const loadPrograms = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('programs')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    setPrograms(data || [])
    setLoading(false)
  }

  const tenantId = process.env.NEXT_PUBLIC_CLIENT_ID ?? 'demo'

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: created, error } = await supabase
      .from('programs')
      .insert({
        coach_id: user.id,
        client_id: tenantId,
        ...newProgram,
      })
      .select('id')
      .single()

    if (!error && created?.id) {
      setShowForm(false)
      setNewProgram({ name: '', description: '' })
      router.push(`/coach/programs/${created.id}`)
    } else {
      loadPrograms()
    }
  }

  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProgram) return
    setSavingEdit(true)
    const { error } = await supabase
      .from('programs')
      .update({
        name: editingProgram.name,
        description: editingProgram.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingProgram.id)
    setSavingEdit(false)
    if (!error) {
      setEditingProgram(null)
      loadPrograms()
    }
  }

  const handleDeleteProgram = async (id: string) => {
    if (!window.confirm('Delete this program? Assigned clients and lessons will be removed.')) return
    setDeletingId(id)
    const { error } = await supabase.from('programs').delete().eq('id', id)
    setDeletingId(null)
    if (!error) loadPrograms()
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Programs</h1>
          <p className="mt-1 text-sm text-[var(--cp-text-muted)]">Create and manage training programs</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Create Program'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Program</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProgram} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Program Name</label>
                <Input
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                  required
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Description</label>
                <textarea
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                  className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-[var(--cp-text-primary)]"
                  rows={4}
                />
              </div>
              <Button type="submit">
                Create Program
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <Card key={program.id} className="hover:shadow-[var(--cp-shadow-card)] transition-shadow flex flex-col border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]">
            <Link href={`/coach/programs/${program.id}`} className="flex-1 min-w-0 flex flex-col">
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--cp-accent-primary-soft)] text-[var(--cp-accent-primary)]">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-[var(--cp-text-primary)]">{program.name}</CardTitle>
                  {program.description && (
                    <p className="mt-1 text-sm text-[var(--cp-text-muted)] line-clamp-2">{program.description}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0" />
            </Link>
            <div className="px-6 pb-4 flex flex-wrap gap-2" onClick={(e) => e.preventDefault()}>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setEditingProgram({
                    id: program.id,
                    name: program.name,
                    description: program.description ?? '',
                  })
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-[var(--cp-accent-danger)] hover:bg-[var(--cp-accent-danger)]/10"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDeleteProgram(program.id)
                }}
                disabled={deletingId === program.id}
              >
                {deletingId === program.id ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!editingProgram}
        onClose={() => !savingEdit && setEditingProgram(null)}
        preventClose={!!savingEdit}
      >
        <div className="p-0">
          <div className="flex flex-row items-center justify-between gap-2 px-6 pt-6 pb-2">
            <h2 className="text-lg font-semibold text-[var(--cp-text-primary)]">Edit program</h2>
            <Button variant="ghost" size="sm" onClick={() => setEditingProgram(null)} disabled={savingEdit}>
              Close
            </Button>
          </div>
          <div className="px-6 pb-6">
            <form onSubmit={handleUpdateProgram} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Name</label>
                <Input
                  value={editingProgram?.name ?? ''}
                  onChange={(e) => setEditingProgram((p) => p ? { ...p, name: e.target.value } : null)}
                  required
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Description</label>
                <textarea
                  value={editingProgram?.description ?? ''}
                  onChange={(e) => setEditingProgram((p) => p ? { ...p, description: e.target.value } : null)}
                  className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-[var(--cp-text-primary)]"
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingProgram(null)} disabled={savingEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  )
}
