'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { bulkUpdateNamesSchema, bulkClientIdsSchema } from '@/lib/validations'
import { sanitizeActionError } from '@/lib/api-error'

export async function bulkUpdateClientNamesAction(
  clientIds: string[],
  fullName: string
): Promise<{ error?: string }> {
  const parsed = bulkUpdateNamesSchema.safeParse({ clientIds, fullName })
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? 'Invalid input'
    return { error: msg }
  }
  const { clientIds: ids, fullName: name } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('clients')
    .update({
      full_name: name,
      updated_at: new Date().toISOString(),
    })
    .eq('coach_id', user.id)
    .in('id', ids)

  if (error) {
    return { error: sanitizeActionError(error) }
  }

  revalidatePath('/coach/clients')
  return {}
}

export async function bulkDeleteClientsAction(
  clientIds: string[]
): Promise<{ error?: string }> {
  const parsed = bulkClientIdsSchema.safeParse({ clientIds })
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? 'Invalid input'
    return { error: msg }
  }
  const { clientIds: ids } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('coach_id', user.id)
    .in('id', ids)

  if (error) {
    return { error: sanitizeActionError(error) }
  }

  revalidatePath('/coach/clients')
  return {}
}
