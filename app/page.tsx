import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'coach') {
      redirect('/coach/dashboard')
    } else {
      redirect('/client/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--cp-bg-page)] flex items-center">
      <AppLayout className="flex justify-center">
        <Card variant="raised" className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-[var(--cp-text-primary)]">
              ClearPath
            </CardTitle>
            <p className="mt-2 text-sm text-[var(--cp-text-muted)]">Coach OS Demo</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/login"
              className="w-full inline-flex justify-center rounded-md px-4 py-2 text-sm font-medium bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cp-border-focus)]"
            >
              Login
            </Link>
            <p className="text-center text-sm text-[var(--cp-text-muted)]">
              Demo: coach@demo.com / demo123
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    </div>
  )
}
