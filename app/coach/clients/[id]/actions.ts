'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteClientAction(clientId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .single()

  if (fetchError || !client) {
    return { error: 'Client not found or you do not have permission to delete it' }
  }

  const { error: deleteError } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('coach_id', user.id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath('/coach/clients')
  revalidatePath('/coach/clients/[id]', 'page')
  redirect('/coach/clients')
}

export async function updateClientProfileAction(
  clientId: string,
  data: { height?: string | null; weight_kg?: number | null; date_of_birth?: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('clients')
    .update({
      height: data.height ?? null,
      weight_kg: data.weight_kg ?? null,
      date_of_birth: data.date_of_birth ?? null,
    })
    .eq('id', clientId)
    .eq('coach_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/coach/clients/${clientId}`)
  return {}
}
