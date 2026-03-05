'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { reorderLessonsSchema } from '@/lib/validations'
import { sanitizeActionError } from '@/lib/api-error'

export async function reorderProgramLessonsAction(
  programId: string,
  lessonIdsInOrder: string[]
): Promise<{ error?: string }> {
  const parsed = reorderLessonsSchema.safeParse({ programId, lessonIdsInOrder })
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }
  const { programId: pid, lessonIdsInOrder: lessonIds } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: program } = await supabase
    .from('programs')
    .select('id')
    .eq('id', pid)
    .eq('coach_id', user.id)
    .single()
  if (!program) return { error: 'Program not found' }

  for (let i = 0; i < lessonIds.length; i++) {
    const { error } = await supabase
      .from('program_lessons')
      .update({ sort_order: i })
      .eq('id', lessonIds[i])
      .eq('program_id', pid)
    if (error) return { error: sanitizeActionError(error) }
  }

  revalidatePath(`/coach/programs/${pid}`)
  return {}
}
