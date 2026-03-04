'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MAX_BULK = 50

export async function bulkUpdateClientNamesAction(
  clientIds: string[],
  fullName: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const ids = clientIds.slice(0, MAX_BULK)
  if (ids.length === 0) {
    return { error: 'No clients selected' }
  }

  const { error } = await supabase
    .from('clients')
    .update({
      full_name: fullName.trim() || 'Unnamed',
      updated_at: new Date().toISOString(),
    })
    .eq('coach_id', user.id)
    .in('id', ids)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/coach/clients')
  return {}
}

export async function bulkDeleteClientsAction(
  clientIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const ids = clientIds.slice(0, MAX_BULK)
  if (ids.length === 0) {
    return { error: 'No clients selected' }
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('coach_id', user.id)
    .in('id', ids)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/coach/clients')
  return {}
}
