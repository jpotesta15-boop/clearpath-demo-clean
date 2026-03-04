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
