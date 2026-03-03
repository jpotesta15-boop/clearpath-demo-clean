import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

export default async function ClientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get client record
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('email', user?.email)
    .single()

  if (!client) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-[var(--cp-text-primary)]">Client profile not found</h1>
        <p className="text-[var(--cp-text-muted)]">
          There is no client record for this account. If your coach invited you, make sure you’re using the same email they have on file.
        </p>
        <p className="text-[var(--cp-text-muted)]">
          <strong>What to do:</strong> Contact your coach and ask to be added as a client and to receive a portal invite. Once they add you and send the invite, you can set your password and sign in here.
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

  const { data: upcomingSessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', client.id)
    .eq('status', 'confirmed')
    .gte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true })
    .limit(5)

  const { data: programs } = await supabase
    .from('program_assignments')
    .select('*, programs(*)')
    .eq('client_id', client.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back, {client.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions && upcomingSessions.length > 0 ? (
              <div className="space-y-4 animate-[fadeInUp_0.35s_ease-out]">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="border-b border-slate-100 pb-4 last:border-0">
                    <p className="font-medium text-slate-900">
                      {format(new Date(session.scheduled_time), 'MMM d, yyyy h:mm a')}
                    </p>
                    <p className="text-sm text-slate-500">Status: {session.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No upcoming sessions</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">My Programs</CardTitle>
          </CardHeader>
          <CardContent>
            {programs && programs.length > 0 ? (
              <div className="space-y-2 animate-[fadeInUp_0.35s_ease-out]">
                {programs.map((assignment: any) => (
                  <div key={assignment.id} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="font-medium text-slate-900">{assignment.programs?.name}</p>
                    {assignment.programs?.description && (
                      <p className="text-sm text-slate-500">{assignment.programs.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No programs assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

