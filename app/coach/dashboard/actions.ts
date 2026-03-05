'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Dismiss the onboarding "Get started" checklist for the current coach.
 * Persists in profiles.preferences.onboarding_checklist_dismissed.
 */
export async function dismissOnboardingChecklist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single()

  const current = (profile?.preferences as Record<string, unknown>) ?? {}
  const next = { ...current, onboarding_checklist_dismissed: true }

  await supabase
    .from('profiles')
    .update({ preferences: next })
    .eq('id', user.id)

  revalidatePath('/coach/dashboard')
}
