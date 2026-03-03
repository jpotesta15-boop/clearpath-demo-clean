'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function ProgramsPage() {
  const router = useRouter()
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newProgram, setNewProgram] = useState({ name: '', description: '' })
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

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programs</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage training programs</p>
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
                <label className="block text-sm font-medium text-gray-700">Program Name</label>
                <Input
                  value={newProgram.name}
                  onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newProgram.description}
                  onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
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
          <Link key={program.id} href={`/coach/programs/${program.id}`}>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{program.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {program.description && (
                  <p className="text-sm text-gray-600 line-clamp-3">{program.description}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

