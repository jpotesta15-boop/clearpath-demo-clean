import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function ClientProgramsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)]"
        >
          Back to login
        </Link>
      </div>
    )
  }

  const { data: assignments } = await supabase
    .from('program_assignments')
    .select('*, programs(*)')
    .eq('client_id', client.id)

  const programIds = (assignments ?? [])
    .map((a: any) => a.programs?.id)
    .filter(Boolean)

  const { data: lessonsByProgram } =
    programIds.length > 0
      ? await supabase
          .from('program_lessons')
          .select('id, sort_order, program_id, lesson_type, title, url, content, video_id, videos(id, title, url)')
          .in('program_id', programIds)
          .order('sort_order', { ascending: true })
      : { data: [] }

  const lessonsByProgramId = (lessonsByProgram ?? []).reduce(
    (acc: Record<string, any[]>, row: any) => {
      const id = row.program_id
      if (!acc[id]) acc[id] = []
      acc[id].push(row)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Programs</h1>
        <p className="mt-1 text-sm text-gray-500">Your assigned training programs and lessons</p>
      </div>

      <div className="space-y-6">
        {assignments && assignments.length > 0 ? (
          assignments.map((assignment: any) => {
            const program = assignment.programs
            const lessons = program ? lessonsByProgramId[program.id] ?? [] : []
            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <CardTitle>{program?.name}</CardTitle>
                  {program?.description && (
                    <p className="text-sm text-gray-600 font-normal">{program.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-gray-700 mb-2">Lessons</p>
                  {lessons.length > 0 ? (
                    <ol className="list-decimal list-inside space-y-2">
                      {lessons.map((lesson: any) => {
                        const type = lesson.lesson_type ?? 'video'
                        if (type === 'video') {
                          return (
                            <li key={lesson.id}>
                              <Link href="/client/videos" className="text-blue-600 hover:underline">
                                {lesson.videos?.title ?? 'Video'}
                              </Link>
                            </li>
                          )
                        }
                        if (type === 'link') {
                          return (
                            <li key={lesson.id}>
                              <a
                                href={lesson.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {lesson.title || lesson.url}
                              </a>
                            </li>
                          )
                        }
                        if (type === 'note') {
                          return (
                            <li key={lesson.id} className="list-item">
                              <span className="text-gray-700">{lesson.content}</span>
                            </li>
                          )
                        }
                        if (type === 'image') {
                          return (
                            <li key={lesson.id}>
                              {lesson.url ? (
                                <a href={lesson.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {lesson.title || 'Image'}
                                </a>
                              ) : (
                                <span>{lesson.title || 'Image'}</span>
                              )}
                            </li>
                          )
                        }
                        return (
                          <li key={lesson.id}>{lesson.videos?.title ?? lesson.title ?? 'Lesson'}</li>
                        )
                      })}
                    </ol>
                  ) : (
                    <p className="text-gray-500 text-sm">No lessons in this program yet.</p>
                  )}
                </CardContent>
              </Card>
            )
          })
        ) : (
          <p className="text-gray-500">No programs assigned yet</p>
        )}
      </div>
    </div>
  )
}

