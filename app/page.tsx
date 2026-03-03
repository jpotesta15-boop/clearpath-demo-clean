import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'

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
    <div className="min-h-screen bg-gray-50 flex items-center">
      <AppLayout className="flex justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">ClearPath</h1>
            <p className="mt-2 text-gray-600">Coach OS Demo</p>
          </div>
          <div className="space-y-4">
            <Link
              href="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Login
            </Link>
            <p className="text-center text-sm text-gray-600">
              Demo: coach@demo.com / demo123
            </p>
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
