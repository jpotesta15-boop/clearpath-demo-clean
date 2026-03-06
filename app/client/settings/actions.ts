'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Update the current user's client record phone number.
 * Client is matched by profile email and tenant (client_id).
 */
export async function updateClientPhoneAction(phone: string | null): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated' }

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id')
    .eq('email', user.email)
    .limit(1)
    .maybeSingle()

  if (fetchError || !client) {
    return { error: 'Client profile not found' }
  }

  const { error } = await supabase
    .from('clients')
    .update({ phone: phone?.trim() || null })
    .eq('id', client.id)

  if (error) return { error: error.message }
  revalidatePath('/client/settings')
  return {}
}
